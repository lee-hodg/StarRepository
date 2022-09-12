const StarNotary = artifacts.require("StarNotary");

const { toBN } = web3.utils;


var accounts;
var owner;

contract('StarNotary', (accs) => {
    accounts = accs;
    owner = accounts[0];
});

it('can Create a Star', async() => {
    let tokenId = 1;
    let instance = await StarNotary.deployed();
    await instance.createStar('Awesome Star!', tokenId, {from: accounts[0]})
    assert.equal(await instance.tokenIdToStarInfo.call(tokenId), 'Awesome Star!')
});

it('lets user1 put up their star for sale', async() => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let starId = 2;
    let starPrice = web3.utils.toWei(".01", "ether");
    await instance.createStar('awesome star', starId, {from: user1});
    await instance.putStarUpForSale(starId, starPrice, {from: user1});
    assert.equal(await instance.starsForSale.call(starId), starPrice);
});

it('lets user1 get the funds after the sale', async() => {
    // See
    // https://ethereum.stackexchange.com/questions/41858/transaction-gas-cost-in-truffle-test-case
    // it's important to use toBN (big number)
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let user2 = accounts[2];
    let starId = 3;
    let starPrice = web3.utils.toWei("0.001", "ether");
    let balance = web3.utils.toWei("0.5", "ether");

    await instance.createStar('awesome star', starId, {from: user1});
    await instance.putStarUpForSale(starId, starPrice, {from: user1});

    // An example of how to get gasUsed and gasPrice, multiply them to get ether consumed
    // and see how much it cost user1 to approve for example (you could do the same with createStar and putStarUpForSale)
    let balanceOfUser1BeforeApprove = toBN(await web3.eth.getBalance(user1));
    const txnReceipt1 = await instance.approve(user2, starId, { from: user1});
    const gasUsed1 = toBN(txnReceipt1.receipt.gasUsed);
    // Obtain gasPrice from the transaction
    const tx1 = await web3.eth.getTransaction(txnReceipt1.tx);
    const gasPrice1 = toBN(tx1.gasPrice);
    let balanceOfUser1BeforeBuy = toBN(await web3.eth.getBalance(user1));
    // Test that the final balance plus gasPrice1*gasUsed1 is the same as before
    assert.equal(balanceOfUser1BeforeBuy.add(gasPrice1.mul(gasUsed1)).toString(), balanceOfUser1BeforeApprove.toString(), "Must be equal");

    // User 2 will pay this so we don't need to track it
    await instance.buyStar(starId, {from: user2, value: balance});
    let balanceOfUser1Final = toBN(await web3.eth.getBalance(user1));

    // The final balance is the balance before he bought it plus the star price
    assert.equal(balanceOfUser1Final.toString(), balanceOfUser1BeforeBuy.add(toBN(starPrice)).toString(), "Must be equal");
});

it('lets user2 buy a star, if it is put up for sale', async() => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let user2 = accounts[2];
    let starId = 4;
    let starPrice = web3.utils.toWei(".01", "ether");
    let balance = web3.utils.toWei(".05", "ether");
    await instance.createStar('awesome star', starId, {from: user1});
    await instance.putStarUpForSale(starId, starPrice, {from: user1});
    await instance.approve(user2, starId, { from: user1});
    let balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user2);
    await instance.buyStar(starId, {from: user2, value: balance});
    assert.equal(await instance.ownerOf.call(starId), user2);
});

it('lets user2 buy a star and decreases its balance in ether', async() => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let user2 = accounts[2];
    let starId = 5;
    let starPrice = web3.utils.toWei(".01", "ether");
    let balance = web3.utils.toWei(".05", "ether");
    await instance.createStar('awesome star', starId, {from: user1});
    await instance.putStarUpForSale(starId, starPrice, {from: user1});

    await instance.approve(user2, starId, { from: user1});

    const balanceOfUser2BeforeTransaction = toBN(await web3.eth.getBalance(user2))
    const txnReceipt = await instance.buyStar(starId, {from: user2, value: balance});
    const gasUsed = toBN(txnReceipt.receipt.gasUsed);
    // Obtain gasPrice from the transaction
    const tx = await web3.eth.getTransaction(txnReceipt.tx);
    const gasPrice = toBN(tx.gasPrice);
    let balanceAfterUser2BuysStar = toBN(await web3.eth.getBalance(user2));
    // Test that the final balance plus gasPrice1*gasUsed1 is the same as before
    assert.equal(balanceAfterUser2BuysStar.add(gasPrice.mul(gasUsed)).add(toBN(starPrice)).toString(),  balanceOfUser2BeforeTransaction.toString(), "Must be equal");

  });

  // Implement Task 2 Add supporting unit tests

it('can add the star name and star symbol properly', async() => {
    // 1. create a Star with different tokenId
    //2. Call the name and symbol properties in your Smart Contract and compare with the name and symbol provided
    let instance = await StarNotary.deployed();
    let name = await instance.name.call()
    assert.equal(name, "STAR");
    let symbol = await instance.symbol.call()
    assert.equal(symbol, "STR");
});

it('lets 2 users exchange stars', async() => {
    // 1. create 2 Stars with different tokenId
    let tokenId1 = 11;
    let tokenId2 = 22;
    let user1 = accounts[0];
    let user2 = accounts[1]
    let instance = await StarNotary.deployed();
    await instance.createStar('Awesome Star 1!', tokenId1, {from: user1})
    assert.equal(await instance.tokenIdToStarInfo.call(tokenId1), 'Awesome Star 1!')
    await instance.createStar('Awesome Star 2!', tokenId2, {from: user2})
    assert.equal(await instance.tokenIdToStarInfo.call(tokenId2), 'Awesome Star 2!')
    assert.equal(await instance.ownerOf.call(tokenId1), user1);
    assert.equal(await instance.ownerOf.call(tokenId2), user2);

    // 2. Call the exchangeStars functions implemented in the Smart Contract
    await instance.approve(user2, tokenId1, { from: user1});
    await instance.approve(user1, tokenId2, { from: user2});
    await instance.exchangeStars(tokenId1, tokenId2, {from: accounts[0]});

    // 3. Verify that the owners changed
    assert.equal(await instance.ownerOf.call(tokenId1), user2);
    assert.equal(await instance.ownerOf.call(tokenId2), user1);
});

it('lets a user transfer a star', async() => {
    // 1. create a Star with different tokenId
    let tokenId = 31;
    let user1 = accounts[0];
    let user2 = accounts[1]
    let instance = await StarNotary.deployed();
    await instance.createStar('Awesome Star 1!', tokenId, {from: user1});
    assert.equal(await instance.ownerOf.call(tokenId), user1);

    // 2. use the transferStar function implemented in the Smart Contract
    // await instance.approve(user2, tokenId, { from: user1});
    await instance.transferStar(user2, tokenId, {from: user1});

    // 3. Verify the star owner changed.
    assert.equal(await instance.ownerOf.call(tokenId), user2);
});

it('lookUptokenIdToStarInfo test', async() => {
    // 1. create a Star with different tokenId
    let tokenId = 41;
    let user1 = accounts[0];
    let instance = await StarNotary.deployed();
    await instance.createStar('Awesome Star 41!', tokenId, {from: user1});

    // 2. Call your method lookUptokenIdToStarInfo
    let starName = await instance.lookUptokenIdToStarInfo(tokenId, {from: user1});


    // 3. Verify if you Star name is the same
    assert.equal(starName, 'Awesome Star 41!');
});

