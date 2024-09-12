import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { token } from "../typechain-types/@openzeppelin/contracts";

describe("MultiSig", function(){

  async function deployToken() {
    const [owner, addr1] = await hre.ethers.getSigners();

    const Token = await hre.ethers.getContractFactory("Token");
    const token = await Token.deploy();

    return {token};
  }

  async function deployMultiSig(){
    const [owner, signer2, signer3, newAccount1] = await hre.ethers.getSigners();

    const {token} = await loadFixture(deployToken);

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

    it("Should revert if amount is less than balance", async function (){

      const {multiSig, newAccount1, token} = await loadFixture(deployMultiSig);

      

      const amt = hre.ethers.parseUnits("10", 18);

      await expect(multiSig.transfer(amt,newAccount1,token)).to.be.revertedWith("insufficient funds"); 
    });
  });
});