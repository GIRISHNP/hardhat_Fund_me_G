// function deployFunc() {
//     console.log("Hi!")
// }
const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
require("dotenv").config()
// module.exports.default = deployFunc

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    // const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    let ethUsdPriceFeedAddress
    if (developmentChains.includes(network.name)) {
        const ethpl = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethpl.address
    }
    else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }
    log("----------------------------------------------------")
    log("Deploying FundMe and waiting for confirmations...")

    const FundMe = await deploy("FundMe", {
        from: deployer,
        args: [ethUsdPriceFeedAddress],//pricefeed address
        log: true,
        waitConfirmation: network.config.blockConfirmations || 1
    })
    // log(`FundMe deployed at ${FundMe.address}`)
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(FundMe.address, [ethUsdPriceFeedAddress])
    }
    log("--------------------------------------")

}

module.exports.tags = ["all", "fundme"]