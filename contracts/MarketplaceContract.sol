// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface CoinContract {
    function transferCoins(address to, uint256 amount) external;
    function getBalance() external view returns (uint256);
}

contract MarketplaceContract {
    address public coinContractAddress;

    constructor(address _coinContract) {
        coinContractAddress = _coinContract;
    }

    function buyCard(uint256 cardId, address seller, uint256 price) external {
        CoinContract coin = CoinContract(coinContractAddress);
        require(coin.getBalance(), "Buyer has no balance"); // Simple check
        coin.transferCoins(seller, price); // Transfer coins to seller
    }
}