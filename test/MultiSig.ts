import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre,  {ethers} from "hardhat";


describe("MultiSig", function(){

  async function deployTokenX() {
    const [owner, signer2, signer3, otherAccount] = await ethers.getSigners();
    
    const TokenX = await ethers.getContractFactory("TokenX");
    const token = await TokenX.deploy();
    
    return { token, owner, signer2, signer3, otherAccount };
  }

  async function deployMultiSig(){
    const [owner, signer2, signer3, newAccount1] = await hre.ethers.getSigners();

    const { token } = await loadFixture(deployTokenX);

    const quorum = 3;
    const validSigners = [signer2, signer3];

    const MultiSig = await hre.ethers.getContractFactory("MultiSig");
    const multiSig = await MultiSig.deploy(quorum, validSigners);
    
    return { multiSig, token, owner, quorum, validSigners, signer2, signer3, newAccount1 };
  }


  describe("Deployment", function(){
    it("Should set the quorum correctly", async function (){
      const {multiSig, quorum} = await loadFixture(deployMultiSig);

      expect(await multiSig.quorum()).to.be.equal(3);
    });

    it("Should set validSigner is correctly", async function (){
      const {multiSig, validSigners} = await loadFixture(deployMultiSig);

      expect(await multiSig.noOfValidSigners()).to.be.equal(3);
    });

    it("Should set txCount correctly", async function (){
      const {multiSig, validSigners} = await loadFixture(deployMultiSig);

      expect(await multiSig.txCount()).to.be.equal(0);
    });
  });

  describe("Transfer function", function(){
    it("Should revert if signer is not a valisigner", async function (){
      const {multiSig, token, owner, signer2, signer3, newAccount1} = await loadFixture(deployMultiSig);

      const amt = hre.ethers.parseUnits("10",18);

      await expect(multiSig.connect(newAccount1).transfer(amt, signer2, token)).to.be.revertedWith("invalid signer");
    });

    it("Should revert if amount is zero", async function (){
      const {multiSig, signer2, signer3, token} = await loadFixture(deployMultiSig);

      const amt = hre.ethers.parseUnits("0",18);

      await expect(multiSig.connect(signer3).transfer(amt, signer2, token)).to.be.revertedWith("can't send zero amount");
    });

    it("Should revert if receipient address is zero", async function () {
      const { multiSig, token, signer2} = await loadFixture(deployMultiSig);
      const amt = hre.ethers.parseUnits("10", 18);

      await expect(multiSig.connect(signer2).transfer(amt, hre.ethers.ZeroAddress, token)).to.revertedWith("address zero found");
    });

    it("Should revert if token address is zero", async function (){
      const {multiSig, newAccount1} = await loadFixture(deployMultiSig);

      const amt = hre.ethers.parseUnits("10", 18);

      await expect(multiSig.transfer(amt,newAccount1,hre.ethers.ZeroAddress )).to.be.revertedWith("address zero found");
    });

    it("Should revert if token address balance is less than amount", async function () {
      
      const { multiSig, signer2, signer3, token} = await loadFixture(deployMultiSig);
      const amountToTransfer = hre.ethers.parseUnits("200", 18);
    
      await token.transfer(multiSig, amountToTransfer);
      expect(await token.balanceOf(multiSig)).to.be.equal(amountToTransfer);

      const balanceAfterDeposit = await token.balanceOf(multiSig);
      console.log(balanceAfterDeposit);


      await token.approve(multiSig, amountToTransfer);

      const amt = hre.ethers.parseUnits("200", 18);

      expect(await multiSig.transfer(amt, signer2.address, token)).to.be.revertedWith("insufficient funds");

      
    });

    it("Should increase txCount After transaction", async function () {
      
      const { multiSig, signer2, token} = await loadFixture(deployMultiSig);
      const amountToTransfer = hre.ethers.parseUnits("500", 18);
    
      await token.transfer(multiSig, amountToTransfer);
      await token.approve(multiSig, amountToTransfer);

      const amt = hre.ethers.parseUnits("10", 18);
      await multiSig.transfer(amt, signer2, token);
      // console.log(multiSig);
      

      expect(await multiSig.txCount()).to.be.equal(1);

    });
  });

  describe("ApproveTx", function (){

    it("should approve transaction when the quorum is reached", async function () {
      const { multiSig, signer2, signer3, token} = await loadFixture(deployMultiSig);

      const amountToTransfer = hre.ethers.parseUnits("500", 18);
    
      await token.transfer(multiSig, amountToTransfer);
      await token.approve(multiSig, amountToTransfer);

      const amt = hre.ethers.parseUnits("10", 18);
      await multiSig.transfer(amt, signer2, token);
     
      const txId = 1;

      await multiSig.connect(signer2).approveTx(txId)

      // let trx = await multiSig.(txId)


      expect(multiSig.approveTx(txId) )
    });
  });
});