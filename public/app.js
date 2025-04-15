const spinContractAddress = '0xD06eF957513AFBc49c55eAea5d6c71E9D10A4758';
const marketplaceContractAddress = '0x449b092Ec3AbF978EeF982d04bf8B7E679A955b1'; 

const spinABI = [
    {"type": "function", "name": "spin", "inputs": [], "stateMutability": "payable", "type": "function"},
    {"anonymous": false, "inputs": [{"indexed": false, "internalType": "address", "name": "user", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "SpinPerformed", "type": "event"}
];

const marketplaceABI = [
    {"type": "function", "name": "buyCard", "inputs": [{"name": "cardId", "type": "uint256"}, {"name": "seller", "type": "address"}], "stateMutability": "payable", "type": "function"},
    {"anonymous": false, "inputs": [{"indexed": false, "internalType": "uint256", "name": "cardId", "type": "uint256"}, {"indexed": false, "internalType": "address", "name": "seller", "type": "address"}, {"indexed": false, "internalType": "address", "name": "buyer", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "price", "type": "uint256"}], "name": "CardSold", "type": "event"}
];

const playersData = [
  { id: 154, name: "Messi" },
  { id: 1100, name: "Haaland" },
  { id: 874, name: "Ronaldo" },
  { id: 152982, name: "Cole Palmer" },
  { id: 133609, name: "Pedri" },
  { id: 386828, name: "Yamal" },
  { id: 762, name: "Vinicius Jr" },
  { id: 129718, name: "Bellingham" },
  { id: 184, name: "Kane" },
  { id: 181812, name: "Musiala" },
  { id: 306, name: "Salah" },
  { id: 37127, name: "Odegaard" },
  { id: 521, name: "Lenwadoski" },
  { id: 629, name: "De Bruyne" },
  { id: 44, name: "Rodri" },
  { id: 278, name: "Mbappe" },
  { id: 290, name: "Van Dijk" },
  { id: 276, name: "Neymar Jr" },
  { id: 217, name: "Martinez" }
];


let web3, account, spin_contract, market_place_contract;

const FIX_PRICE = 0.0001;

window.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
                page.classList.add('hidden');
            });
            const targetPage = document.getElementById(targetId);
            if (targetPage) {
                targetPage.classList.add('active');
                targetPage.classList.remove('hidden');
                if (targetId === 'marketplacePage') update_marketplace_ui();
                else if (targetId === 'collectionPage') update_collection_ui();
            }
        });
    });

    const connectBtn = document.getElementById('connectButton');
    connectBtn.addEventListener('click', debounce(connect_wallet, 500));

    const spin_button = document.getElementById('spin_button');
    spin_button.addEventListener('click', handle_spin);

    document.getElementById('sellCardBtn')?.addEventListener('click', open_sell_model);
    document.getElementById('confirmSellBtn')?.addEventListener('click', confirm_sell);
    document.querySelector('#sellCardModal .modal-close')?.addEventListener('click', close_sell_model);
    document.getElementById('keepCardBtn')?.addEventListener('click', handle_keep_card);

    document.addEventListener('click', (e) => {
        if (e.target.id === 'goToSpinBtn') {
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
                page.classList.add('hidden');
            });
            const spinPage = document.getElementById('spinWheelPage');
            spinPage.classList.remove('hidden');
            spinPage.classList.add('active');
        }
    });

    spin_wheel_names();
    window.addEventListener('resize', debounce(spin_wheel_names, 100));


    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        spin_contract = new web3.eth.Contract(spinABI, spinContractAddress);
        market_place_contract = new web3.eth.Contract(marketplaceABI, marketplaceContractAddress);

        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            account = accounts[0];
            document.getElementById('accountDisplay').innerText =  `Metamask Wallet ID: ${shorten_wallet_address(account)}`;
            update_balance();
            document.getElementById('navbar').classList.remove('hidden');
            document.getElementById('homePage').classList.add('active');
            document.getElementById('homePage').classList.remove('hidden');
        }

        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                account = accounts[0];
                document.getElementById('accountDisplay').innerText = `Metamask Wallet ID: ${shorten_wallet_address(account)}`;
                update_balance();
                update_collection_ui();
                update_marketplace_ui();
            } else {
                account = null;
                document.getElementById('accountDisplay').innerText = '';
                document.getElementById('balanceDisplay').innerText = '';
                document.getElementById('navbar').classList.add('hidden');
            }
        });
    } else {
        alert("Install MetaMask");
    }
});

async function connect_wallet() {
    if (!window.ethereum) {
        alert("Install MetaMask");
        return;
    }

    try {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
            const newAccounts = await ethereum.request({ method: 'eth_requestAccounts' });
            account = newAccounts[0];
        } else {
            account = accounts[0];
        }

        document.getElementById('accountDisplay').innerText = shorten_wallet_address(account);
        update_balance();
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('homePage').classList.add('active');
        document.getElementById('homePage').classList.remove('hidden');
    } catch (error) {
        if (error.code === -32002) {
            alert("MetaMask is already processing a request. Please check the MetaMask popup.");
        } else {
            alert("Connection failed: " + error.message);
        }
        console.error("Connection error:", error);
    }
}

async function handle_spin() {
  const spin_button = document.getElementById('spin_button');
  spin_button.disabled = true;
  spin_button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Spinning...';
  
  try {
    const spinCost = web3.utils.toWei('0.0001', 'ether'); // Fixed at 0.0001 ETH
    const ethBalance = await web3.eth.getBalance(account);
    
    if (parseInt(ethBalance) < parseInt(spinCost)) {
      alert("Not enough SepholiaETH (need 0.0001 SepholiaETH)");
      spin_button.disabled = false;
      spin_button.innerHTML = 'Spin the Wheel (Costs 0.0001 SepholiaETH)';
      return;
    }

    await spin_contract.methods.spin().send({ from: account, value: spinCost });
    
    spin_wheel_animation();
    
    setTimeout(() => {
      if (Math.random() < 0.5) {
        const randomPlayer = playersData[Math.floor(Math.random() * playersData.length)];
        
        display_new_card(randomPlayer.id, randomPlayer.name);
        fetch_player_details(randomPlayer.id);
        
        document.getElementById('spinResult').innerHTML = `
          <div class="success-message">
            Congratulations! You won a ${randomPlayer.name} card!
          </div>
        `;
      } else {
        document.getElementById('spinResult').innerHTML = `
          <div class="error-message">
            Sorry, no card won this time. Try again!
          </div>
        `;
      }
      
      spin_button.disabled = false;
      spin_button.innerHTML = 'Spin the Wheel (Costs 0.0001 ETH)';
      
      update_balance();
    }, 3100);
    } catch (error) {
        alert("Spin failed: " + error.message);
    }
}

function spin_wheel_animation() {
    const wheel = document.getElementById('spinWheel');
    if (!wheel) return;
    
    const full_rotations = 5 + Math.floor(Math.random() * 5);
    const segment_angle = 360 / playersData.length;
    const random_segment = Math.floor(Math.random() * playersData.length) * segment_angle;
    const total_rotation = (full_rotations * 360) + random_segment;
    
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    
    void wheel.offsetWidth;
    
    wheel.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    wheel.style.transform = `rotate(${-total_rotation}deg)`;
    
    setTimeout(() => {
      const normalized_rotation = total_rotation % 360;
      const winning_index = Math.floor(normalized_rotation / segment_angle);
      const winning_player = playersData[(playersData.length - winning_index) % playersData.length];
      console.log("Winner:", winning_player.name);
    }, 3000);
  }

function display_new_card(playerId, playerName) {
  window.currentCard = { id: playerId, name: playerName };
  const container = document.getElementById('newCardContainer');
  container.classList.remove('hidden');
  
  const cardElement = document.getElementById('newCard');
  cardElement.innerHTML = `
    <img src="/card_images/player_${playerId}.png" alt="${playerName}">
    <p>${playerName}</p>
    <p>ID: ${playerId}</p>
  `;
  
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handle_keep_card() {
    if (window.currentCard) {
        await fetch('/api/collection/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: account, cardId: window.currentCard.id, name: window.currentCard.name })
        });
        alert("Card kept!");
        update_collection_ui();
        document.getElementById('newCardContainer').classList.add('hidden');
    }
}

function open_sell_model() {
    const modal = document.getElementById('sellCardModal');
    modal.classList.remove('hidden');
    
    const originalCard = document.getElementById('newCard');
    const cardImage = originalCard.querySelector('img').src;
    const cardName = originalCard.querySelector('p:first-of-type').textContent;
    const cardId = originalCard.querySelector('p:last-of-type').textContent;
    
    const preview = document.getElementById('sellCardPreview');
    preview.innerHTML = `
        <div class="card" style="transform: none; margin: 0 auto;">
            <img src="${cardImage}" alt="${cardName}" style="transform: none;">
            <p>${cardName}</p>
            <p>${cardId}</p>
        </div>
    `;
}

function close_sell_model() {
    document.getElementById('sellCardModal').classList.add('hidden');
}

async function confirm_sell() {
    const priceInUnits = document.getElementById('cardPrice').value; 
    if (!priceInUnits || priceInUnits <= 0) return alert("Enter a valid price");

    const priceInEth = priceInUnits * FIX_PRICE; // 1 unit = 0.0001 ETH
    const priceInWei = web3.utils.toWei(priceInEth.toString(), 'ether');
    if (window.currentCard) {
        await fetch('/api/marketplace/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: window.currentCard.id, seller: account, price: priceInWei, name: window.currentCard.name })
        });
        alert(`Listed ${window.currentCard.name} for ${priceInUnits} coins (${priceInEth} ETH)!`);
        close_sell_model();
        document.getElementById('newCardContainer').classList.add('hidden');
        update_marketplace_ui();
    }
}

async function update_marketplace_ui() {
    const res = await fetch('/api/marketplace');
    const data = await res.json();
    const container = document.getElementById('marketplace');
    container.innerHTML = "";

    if (data.listings.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>No listings available.</p></div>`;
    } else {
        data.listings.forEach(listing => {
            const priceInEth = web3.utils.fromWei(listing.price, 'ether');
            const priceInUnits = priceInEth / FIX_PRICE; // Convert ETH to units
            const cardElem = document.createElement('div');
            cardElem.className = "card";
            cardElem.innerHTML = `
                <img src="/card_images/player_${listing.cardId}.png" alt="${listing.name}">
                <p>${listing.name}</p>
                <p>Price: ${priceInUnits} coins (${priceInEth} SepholiaETH)</p>
                <button class="buy-card-btn">Buy</button>
            `;
            const buyBtn = cardElem.querySelector('.buy-card-btn');
            buyBtn.addEventListener('click', async () => {
                try {
                    await market_place_contract.methods.buyCard(listing.cardId, listing.seller).send({
                        from: account,
                        value: listing.price
                    });
                    await fetch('/api/marketplace/buy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cardId: listing.cardId, buyer: account })
                    });
                    alert(`Bought ${listing.name} for ${priceInUnits} coins (${priceInEth} SepholiaETH)!`);
                    update_balance();
                    update_marketplace_ui();
                    update_collection_ui();
                } catch (error) {
                    alert("Buy failed: " + error.message);
                }
            });
            container.appendChild(cardElem);
        });
    }
}

async function update_collection_ui() {
    const res = await fetch(`/api/collection/${account}`);
    const data = await res.json();
    const container = document.getElementById('collectionCards');
    container.innerHTML = "";

    if (data.collection.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>No cards yet. Spin to win!</p><button id="goToSpinBtn">Spin Now</button></div>`;
    } else {
        data.collection.forEach(card => {
            const cardElem = document.createElement('div');
            cardElem.className = "card";
            cardElem.innerHTML = `
                <img src="/card_images/player_${card.cardId}.png" alt="${card.name}">
                <p>${card.name}</p>
            `;
            container.appendChild(cardElem);
        });
    }
}

function spin_wheel_names() {
    const wheel = document.getElementById('spinWheel');
    if (!wheel) return;
    
    const existingSegments = wheel.querySelectorAll('.wheel-segment');
    existingSegments.forEach(segment => segment.remove());
    
    const segment_angle = 360 / playersData.length;
    
    playersData.forEach((player, index) => {
      const segment = document.createElement('div');
      segment.className = 'wheel-segment';
      
      const rotation = segment_angle * index;
      segment.style.transform = `rotate(${rotation}deg)`;
      
      const nameElement = document.createElement('div');
      nameElement.className = 'wheel-segment-name';
      nameElement.textContent = player.name;
      
      const translateX = player.name.length > 8 ? '110px' : '120px';
      nameElement.style.transform = `rotate(90deg) translateX(${translateX})`;
      
      segment.appendChild(nameElement);
      wheel.appendChild(segment);
    });
  }

function shorten_wallet_address(address) {
    return address.slice(0, 6) + "..." + address.slice(-4);
}

async function update_balance() {
    const ethBalance = await web3.eth.getBalance(account);
    document.getElementById('balanceDisplay').innerText = 'Balance: ' + web3.utils.fromWei(ethBalance, 'ether') + ' SepholiaETH';
}

async function fetch_player_details(playerId) {
    try {
        const res = await fetch(`/api/player/${playerId}`);
        const data = await res.json();
        if (data.response && data.response.length > 0) {
            const playerInfo = data.response[0].player;
            const stats = data.response[0].statistics?.[0] || {};
            const details = {
                name: playerInfo.name,
                firstname: playerInfo.firstname,
                lastname: playerInfo.lastname,
                age: playerInfo.age,
                nationality: playerInfo.nationality,
                team: stats.team?.name || "N/A"
            };
            display_player_details(details);
        } else {
            document.getElementById('playerDetails').innerText = "No details found.";
        }
    } catch (error) {
        console.error("Error fetching player details:", error);
        document.getElementById('playerDetails').innerText = "Error fetching details.";
    }
}

function display_player_details(details) {
  const container = document.getElementById('playerDetails');
  if (!container) return;
  
  container.innerHTML = `
    <div class="player-detail-item">
      <span class="player-detail-label">Name</span>
      <span class="player-detail-value">${details.name}</span>
    </div>
    <div class="player-detail-item">
      <span class="player-detail-label">Age</span>
      <span class="player-detail-value">${details.age}</span>
    </div>
    <div class="player-detail-item">
      <span class="player-detail-label">First Name</span>
      <span class="player-detail-value">${details.firstname}</span>
    </div>
    <div class="player-detail-item">
      <span class="player-detail-label">Last Name</span>
      <span class="player-detail-value">${details.lastname}</span>
    </div>
    <div class="player-detail-item">
      <span class="player-detail-label">Nationality</span>
      <span class="player-detail-value">${details.nationality}</span>
    </div>
    <div class="player-detail-item">
      <span class="player-detail-label">Team</span>
      <span class="player-detail-value">${details.team}</span>
    </div>
  `;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}