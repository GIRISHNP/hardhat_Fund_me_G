const { ethers, deployments, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")
!developmentChains.includes(network.name) ? describe.skip :
    describe("FundMe", async function () {
        let fundMe
        let mockV3Aggregator
        let deployer

        const sendValue = ethers.utils.parseEther("1")// equals to "1000000000000000000"
        beforeEach(async () => {
            // const accounts = await ethers.getSigners()
            // deployer = accounts[0]
            deployer = (await getNamedAccounts()).deployer
            //deploying all the contracts 
            await deployments.fixture(["all"])
            // getting contrats to work with thier specific functions 
            // recent deployments connects to deployer to make transactions 
            fundMe = await ethers.getContract("FundMe", deployer)
            mockV3Aggregator = await ethers.getContract(
                "MockV3Aggregator",
                deployer
            )
        })

        describe("constructor", function () {
            it("sets the aggregator addresses correctly", async () => {
                //once the constructor is called checking the value is assigned or not
                const response = await fundMe.getPriceFeed()
                assert.equal(response, mockV3Aggregator.address)
            })
        })
        describe("fund", async () => {
            // u have to add require("@nomicfoundation/hardhat-chai-matchers") to work with revert funtion of chai
            it("Fails if you don't send enough ETH", async () => {
                await expect(fundMe.fund()).to.be.revertedWith(
                    "Not enough eth!"
                )
            })
            it("Checks for updated adress to dollaer mapping", async () => {
                // mapps to data structure with some amount 
                await fundMe.fund({ value: sendValue })
                // checking if the same deployer send that amount or not 
                const response = await fundMe.getAddressToAmountFunded(
                    deployer
                )
                assert.equal(response.toString(), sendValue.toString())
            })
            it("Adds funder to array of funders", async () => {
                await fundMe.fund({ value: sendValue })
                // checking the array that the list of funders in array or not
                const response = await fundMe.getFunder(0)
                assert.equal(response, deployer)
            })
        })
        describe("withdraw", async () => {
            // first we have to fund with eth
            beforeEach(async () => {
                await fundMe.fund({ value: sendValue })
            })
            it("withdraws ETH from a single funder", async () => {
                // Arrange
                const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                //we are using break point in next line to see gas cost in transaction reciept
                //Take the two objects from transaction reciept to calculate gas cost
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

                // Assert
                // Maybe clean up to understand the testing
                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingFundMeBalance
                        .add(startingDeployerBalance)
                        .toString(),
                    endingDeployerBalance.add(gasCost).toString()
                )

            })
            it("is allows us to withdraw with multiple funders", async () => {
                // Arrange
                // get multiple accounts that has been deployed 
                const accounts = await ethers.getSigners()
                //take each account connect that account and send value to fundme contract with each account 
                for (i = 1; i < 6; i++) {
                    const fundMeConnectedContract = await fundMe.connect(
                        accounts[i]
                    )
                    await fundMeConnectedContract.fund({ value: sendValue })
                }
                const startingFundMeBalance =
                    await fundMe.provider.getBalance(fundMe.address)
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)
                // Act
                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                //we are using break point in next line to see gas cost in transaction reciept
                //Take the two objects from transaction reciept to calculate gas cost
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

                // Assert
                // Maybe clean up to understand the testing
                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingFundMeBalance
                        .add(startingDeployerBalance)
                        .toString(),
                    endingDeployerBalance.add(gasCost).toString()
                )

                //makesure that funders are reset properly 
                await expect(fundMe.getFunder(0)).to.be.reverted
                // reset the adress to map =0 
                for (i = 1; i < 6; i++) {
                    assert.equal(await fundMe.getAddressToAmountFunded(accounts[i].address), 0)
                }

            })
            it("Only allows the owner to withdraw", async function () {
                const accounts = await ethers.getSigners()
                const attacker = accounts[1]
                const attackerConnectedContract = await fundMe.connect(attacker)
                await expect(attackerConnectedContract.withdraw()).to.be.revertedWithCustomError(attackerConnectedContract, "FundMe__NotOwner")
            })


        })

    })