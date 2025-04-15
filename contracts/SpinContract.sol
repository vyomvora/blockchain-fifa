// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SpinContract {
    uint256 public constant SPIN_COST = 0.0001 ether; // Fixed cost per spin

    event SpinPerformed(address user, uint256 amount);

    function spin() external payable {
        require(msg.value >= SPIN_COST, "Must send at least 0.0001 ETH");
        emit SpinPerformed(msg.sender, msg.value);
        // ETH stays in the contract (could be burned or sent elsewhere if desired)
    }

    // Optional: Allow owner to withdraw ETH (for testing/simplicity)
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function withdraw() external {
        require(msg.sender == owner, "Only owner");
        (bool sent, ) = owner.call{value: address(this).balance}("");
        require(sent, "Failed to withdraw");
    }
}