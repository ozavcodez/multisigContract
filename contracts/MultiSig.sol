// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// write a multiSig contract 
contract MultiSig {
    uint8 public quorum;
    uint public noOfValidSigners;
    uint256 public txCount;


// define the transaction type
    struct Transaction{
        uint256 id;
        uint256 amount;
        address sender;
        address recipient;
        uint256 timestamp;
        uint noOfApproval;
        bool isCompleted;
        address tokenAddress;
        address[] transactionSigners;
    }
    struct UpdateState{
        uint8 newQuorum;
        bool isCompleted;
        uint noOfApproval;
        uint256 timestamp;
        address[] transactionSigners;
    }

    // map the updatestate to an Id and keep track of each time a state update is initiated

    mapping(uint => UpdateState) updatesStates;

// map a transaction to a unique identifier to keep track of the transactions
    mapping(address => bool) isValidSigner;
    mapping(uint => Transaction) transactions; // txId -> Transaction
    // signer -> transactionId -> bool (checking if an address has signed)
    mapping(address => mapping(uint256 => bool)) hasSigned;
    

    constructor(uint8 _quorum, address[] memory _validSigners) {
        require(_validSigners.length > 1, "few valid signers");
        require(_quorum > 1, "quorum is too small");


        for(uint256 i = 0; i < _validSigners.length; i++) {
            require(_validSigners[i] != address(0), "zero address not allowed");
            require(!isValidSigner[_validSigners[i]], "signer already exist");

            isValidSigner[_validSigners[i]] = true;
        }

        noOfValidSigners = uint8(_validSigners.length);

        if (!isValidSigner[msg.sender]){
            isValidSigner[msg.sender] = true;
            noOfValidSigners += 1;
        }

        require(_quorum <= noOfValidSigners, "quorum greater than valid signers");
        quorum = _quorum;
    }
      function transfer(uint256 _amount, address _recipient, address _tokenAddress) external {
        require(msg.sender != address(0), "address zero found");
        require(isValidSigner[msg.sender], "invalid signer");

        require(_amount > 0, "can't send zero amount");
        require(_recipient != address(0), "address zero found");
        require(_tokenAddress != address(0), "address zero found");

        require(IERC20(_tokenAddress).balanceOf(address(this)) >= _amount, "insufficient funds");

        uint256 _txId = txCount + 1;
        Transaction storage trx = transactions[_txId];
        
        trx.id = _txId;
        trx.amount = _amount;
        trx.recipient = _recipient;
        trx.sender = msg.sender;
        trx.timestamp = block.timestamp;
        trx.tokenAddress = _tokenAddress;
        trx.noOfApproval += 1;
        trx.transactionSigners.push(msg.sender);
        hasSigned[msg.sender][_txId] = true;

        txCount += 1;
    }
    function approveTx(uint8 _txId) external {
        Transaction storage trx = transactions[_txId];

        require(trx.id != 0, "invalid tx id");
        
        require(IERC20(trx.tokenAddress).balanceOf(address(this)) >= trx.amount, "insufficient funds");
        require(!trx.isCompleted, "transaction already completed");
        require(trx.noOfApproval < quorum, "approvals already reached");

        require(isValidSigner[msg.sender], "not a valid signer");
        require(!hasSigned[msg.sender][_txId], "can't sign twice");

        hasSigned[msg.sender][_txId] = true;
        trx.noOfApproval += 1;
        trx.transactionSigners.push(msg.sender);

        if(trx.noOfApproval == quorum) {
            trx.isCompleted = true;
            IERC20(trx.tokenAddress).transfer(trx.recipient, trx.amount);
        }
    }
    function updateQuorum(uint8 _quorum) external{
        uint256 _txId = txCount + 1;
        UpdateState storage trx = updatesStates[_txId];
        require(_quorum > 0, "quorum must be greater") ;
        require(_quorum <= noOfValidSigners, "quorum greater than valid signers");
        trx.newQuorum = _quorum;
    }
    function appproveQuorum(uint8 _txId) external{
        UpdateState storage trx = updatesStates[_txId];
        require(_txId != 0, "invalid tx id");
        require(trx.noOfApproval < quorum, "approvals already reached");
        require(isValidSigner[msg.sender], "not a valid signer");
        require(!hasSigned[msg.sender][_txId], "can't sign twice");

        hasSigned[msg.sender][_txId] = true;
        trx.noOfApproval += 1;
        trx.transactionSigners.push(msg.sender);

        if(trx.noOfApproval == quorum) {
            trx.isCompleted = true;
        }
        
        quorum = trx.newQuorum;
    }
    
    function getTransaction(uint8 _txId) public view returns (Transaction memory) {
        return transactions[_txId];
    }


   
}