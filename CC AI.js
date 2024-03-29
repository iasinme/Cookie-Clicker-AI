//version 18.1

/*this is super cheaty
var obj = 16;
var time = 70;
var pow = Game.ObjectsById[obj].amount/10+1;
Game.gainBuff('building buff', time, pow, obj);
*/

var upgradeList = [];
var unknownPPUpgrades = [52, 53, 75, 76, 77, 78, 86, 87, 119, 152, 157, 158, 159, 160, 161, 163, 164, 190, 191, 222, 224, 225, 226, 229, 324, 366, 367, 427, 460, 461, 473, 474, 475, 640, 642];
var buildingBought;
var upgradeBought;
var buyingThings;
var lowestPP;
var stocksBought = [];
var stocksCurrent = [];
var marketAvg = [ //These numbers came from an analysis of the stock market from Sept-Nov 2023.  They're the upper and lower bounds for the 50% probablity around the average value.  basically, there's a 25% chance the stock will be lower that the min and a 25% chance it will be higher than the max.
		[6, 50], //Farm
		[10, 60], //Mine
		[11, 65], //Factory
		[12, 72], //Bank
		[20, 82], //Temple
		[24, 92], //Wizard tower
		[27, 93], //Shipment
		[38, 106], //Alchemy lab
		[45, 115], //Portal
		[53, 125], //Time machine
		[65, 135], //Antimatter condenser
		[70, 140], //Prism
		[81, 147], //Chancemaker
		[87, 153], //Fractal engine
		[100, 160], //Javascript console
		[109, 169], //Idleverse
		[115, 177], //Cortex baker
		[119, 185]]; //You
var atMarket;
var autoAscensionActive;
var seasonCounter;

var autoSanta;
var autoHearts;
var autoDragon;
var pet;
var petting;
var pettingCount;
var autoBuy;
var autoAscension;
var fortuneCheck;
var goldenClick;
var seasonCheck;
var dragonCheck;
var dragonPetCheck;
var noWrinkler;
var collectHCData;
var collectSMdata;
var autoCast;
var autoStocks;

var grimoire = Game.Objects["Wizard tower"].minigame;
var StockMarket = Game.Objects["Bank"].minigame;

var HCdata = [];
var SMdata = [];


Game.LoadMod('https://iasinme.github.io/Cookie-Clicker-AI/CookieMonster.js');
initializeStocksBought();
startAI();

function startAI() {
	autoAscensionActive = false;
	buyingThings = false;
	petting = false;
	seasonCounter = 0;
	
    autoBuy = setInterval(MarketCheck, (10 * 60 * 1000)); //functioning

    //autoAscension = setInterval(function(){AutoAscend(false)}, (24 * 60 * 60 * 1000)); //functioning

    //ascensionCheck = setInterval(AscendCheck, (24 * 60 * 60 * 1000)); //functioning

    fortuneCheck = setInterval(ClickTicker, (10 * 1000)); //functioning

    seasonCheck = setInterval(CycleSeasons, (30 * 60 * 1000)); //functioning
	
	dragonCheck = setInterval(TrainDragon, (10 * 60 * 1000)); //functioning
	
	dragonPetCheck = setInterval(PetDragonCycle, (15 * 60 * 1000)); //untested

    noWrinkler = setInterval(Game.CollectWrinklers, (30 * 60 * 1000)); //functioning
	
	autoCast = setInterval(Cast, (10 * 60 * 1000)); //functioning
	
	autoStocks = setInterval(CheckStockMarket, (60 * 1000)); //functioning, being optimized
	
	//collectHCData = setInterval(getHCData, (30 * 60 * 1000)); //functioning
	
	//collectSMdata = setInterval(getSMData, (60 * 1000)); //functioning

    goldenClick = setInterval(function () { //functioning
            Game.shimmers.forEach(function (shimmer) {
                if (shimmer.type == "golden")
                    shimmer.wrath = 0
                shimmer.pop()
            })
        }, 500);
}

function stopAI() {
	autoAscensionActive = false;
	buyingThings = false;
	seasonCounter = 0;
	
    clearInterval(autoBuy);

    clearInterval(autoAscension);

    clearInterval(AscendCheck);

    clearInterval(fortuneCheck);

    clearInterval(seasonCheck);
	
	clearInterval(dragonCheck);
	
	clearInterval(dragonPetCheck);

    clearInterval(noWrinkler);

    clearInterval(goldenClick);

    clearInterval(atMarket);

    clearInterval(autoSanta);

    clearInterval(autoHearts);
	
	clearInterval(autoCast);
	
	clearInterval(autoDragon);
	
	clearInterval(autoStocks);
	
	clearInterval(collectHCData);
	
	clearInterval(collectSMdata);

}

function MarketCheck() {
    if (Game.UpgradesById[73].bought == 1) { //last research upgrade
        clearInterval(autoBuy);
        autoBuy = setInterval(MarketCheck, (1 * 60 * 60 * 1000));
    } else {
        clearInterval(autoBuy);
        autoBuy = setInterval(MarketCheck, (2 * 60 * 1000));
    }

    if (!buyingThings) {
        atMarket = setInterval(BuyThings, 10);
        //console.log("Going to Market:\n" + new Date().getTime());
    }
}

function BuyThings() {
    buyingThings = true;
    buildingBought = false;
    upgradeBought = false;
    var myCookies = Game.cookies;
    lowestPP = IndexOfLowestPP();

    if (lowestPP[0] == "building") {
        if (myCookies >= Game.ObjectsById[lowestPP[1]].getPrice()) {
            Game.ObjectsById[lowestPP[1]].buy(1);
            myCookies = Game.cookies;
            buildingBought = true;
        }
    } else { //if it's an upgrade
        if (myCookies >= upgradeList[lowestPP[1]].getPrice()) {
            upgradeList[lowestPP[1]].buy(true); //.buy(true) allows me to buy 'One Mind' without pressing the 'ok' button
            myCookies = Game.cookies;
            upgradeBought = true;
			//console.log("Upgrade Bought: " + upgradeList[lowestPP[1]].name + "\tID: " + upgradeList[lowestPP[1]].id);
        }
    }

    for (i in unknownPPUpgrades) {
        if (Buyable(unknownPPUpgrades[i])){
            Game.UpgradesById[unknownPPUpgrades[i]].buy();
			upgradeBought = true;
		}
    }

    if ((!buildingBought && !upgradeBought)) {
        clearInterval(atMarket);
        buyingThings = false;
        //console.log("Done at Market:\n" + new Date().getTime());
    }
}

function IndexOfLowestPP() { //0 for building, 1 for upgrade
    var lowestBuildingIndex = 0;
    var lowestUpgradeIndex = 0;
    ResetLists();

    for (var i in Game.ObjectsById) {
        if (CM.Cache.Objects1[Game.ObjectsById[i].name].pp < CM.Cache.Objects1[Game.ObjectsById[lowestBuildingIndex].name].pp)
            lowestBuildingIndex = i;
    }

    if (upgradeList.length > 0) {
        for (var i in upgradeList) {
            if (CM.Cache.Upgrades[upgradeList[i].name].pp < CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp)
                lowestUpgradeIndex = i;
        }

/*         if (CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp < 0 || CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp == Infinity) {
            lowestUpgradeIndex = 0;
            console.log("Payback Period was < 0 or == Infinity");
        }
 */
        if (CM.Cache.Objects1[Game.ObjectsById[lowestBuildingIndex].name].pp <  CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp)
            return ["building", Number(lowestBuildingIndex)];
        if (CM.Cache.Objects1[Game.ObjectsById[lowestBuildingIndex].name].pp >= CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp)
            return ["upgrade", Number(lowestUpgradeIndex)];
    } else {
        return ["building", Number(lowestBuildingIndex)];
    }
}

function ResetLists() { //creates a list of viable upgrades
    upgradeList = [];

    for (var i in Game.UpgradesInStore) {
        if (Game.UpgradesInStore[i].id != 74 && //Elder Pledge
            Game.UpgradesInStore[i].id != 182 && //Festive Biscuit
            Game.UpgradesInStore[i].id != 183 && //Ghostly Biscuit
            Game.UpgradesInStore[i].id != 184 && //Lovesick Biscuit
            Game.UpgradesInStore[i].id != 185 && //Fool's Biscuit
            Game.UpgradesInStore[i].id != 209 && //Bunny Biscuit
            Game.UpgradesInStore[i].id != 331 && //Golden Switch [Off]
            Game.UpgradesInStore[i].id != 332 && //Golden Switch [On]
            Game.UpgradesInStore[i].id != 563 && //Shimmering Veil [Off]
            Game.UpgradesInStore[i].id != 564 && //Shimmering Veil [On]
            Game.UpgradesInStore[i].id != 452 && //Sugar Frenzy
            Game.UpgradesInStore[i].id != 361 && //Golden Cookie Sound Selector
			Game.UpgradesInStore[i].id != 765 && //Jukebox
            Game.UpgradesInStore[i].id != 333 && //Milk Selector
            Game.UpgradesInStore[i].id != 414 && //Background Selector
            Game.UpgradesInStore[i].id != 227 && //Chocolate Egg
            CM.Cache.Upgrades[Game.UpgradesInStore[i].name].pp >= 0 &&
            CM.Cache.Upgrades[Game.UpgradesInStore[i].name].pp != Infinity)

            upgradeList.push(Game.UpgradesInStore[i]);
    }
    upgradeList.sort(); //not sure why this is here or if it's even needed.
}

function AscendCheck() { //checks if autoAscension is currently running and turns it on if it's not
    if (!autoAscensionActive) {
        autoAscension = setInterval(AutoAscend(false), (24 * 60 * 60 * 1000));
        autoAscensionActive = true;
    }
}

function AutoAscend(overide) {
    var futureChips;

    futureChips = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned)) - Math.floor(Game.HowMuchPrestige(Game.cookiesReset));
    if ((futureChips >= Math.pow(10, 12) && autoAscensionActive) || overide) {
		if (Buyable(227)) Game.UpgradesById[227].buy(); //chocolate egg
		//downloadCSV();
        Game.Ascend(true);
        stopAI();
        setTimeout(function () {
            Game.Reincarnate(true)
        }, (15 * 1000));
        setTimeout(MarketCheck, (1 * 60 * 1000));
        setInterval(seasonCheck, (1 * 60 * 60 * 1000));
        startAI();
    }

    /*if ((Game.prestige + futureChips) % 1000000 == 777777){
    Game.Ascend(true);
    clearInterval(autoAscension);
    }*/
}

function ClickTicker() {
    if (Game.TickerEffect.type == 'fortune' ||
        Game.Ticker.includes("Today is your lucky day!") ||
        Game.Ticker.includes("Your lucky numbers are : ")) {
        Game.tickerL.click();
    }
    /*else {
    Game.getNewTicker(false);
    }*/
}

function CycleSeasons() {
    SeasonChecker();
    //seasonCounter 0:1st Christmas, 1:Valentines, 2:Easter, 3:2nd Christmas, 4:Halloween
	
	switch(seasonCounter){
		case 0:
			if (Game.season == "christmas" || (Game.UpgradesById[182].canBuy() && Game.season != "christmas")) {
				if (Game.season != "christmas")
					Game.UpgradesById[182].buy(); //Christmas
				autoSanta = setInterval(UpgradeSanta, (5 * 1000));
			}
		break;
		case 1:
			if (Game.season == "valentines" || (Game.UpgradesById[184].canBuy() && Game.season != "valentines")) {
				if (Game.season != "valentines")
					Game.UpgradesById[184].buy(); //Valentines
				autoHearts = setInterval(BuyHearts, (5 * 1000));
			}
		break;
		case 2:
			if (Game.UpgradesById[209].canBuy() && Game.season != "easter") {
				Game.UpgradesById[209].buy(); //Easter
			}
		break;
		case 3:
			if (Game.UpgradesById[182].canBuy() && Game.season != "christmas") {
				Game.UpgradesById[182].buy(); //Christmas
			}
		break;
		case 4:
			if (Game.UpgradesById[183].canBuy() && Game.season != "halloween") {
				Game.UpgradesById[183].buy(); //Halloween
			}
		break;
		default:
			//console.log("Seasons Completed");
			clearInterval(seasonCheck);
		break;
	}
}

function SeasonChecker() {
    var count = 0;
    var bound;
    var seasonUpgrades = [16, 7, 19, 7, 7];
    if (seasonCounter == 0) //Christmas
        bound = [152, 168];
    if (seasonCounter == 1) //Valentines
        bound = [169, 174];
    if (seasonCounter == 2) //Easter
        bound = [210, 229];
    if (seasonCounter == 3) //2nd Christmas
        bound = [143, 149];
    if (seasonCounter == 4) //Halloween
        bound = [134, 140];

    if (seasonCounter <= 4) {
        for (i = bound[0]; i <= bound[1]; i++) {
            if (Game.UpgradesById[i].unlocked == 1 && i != 167 && i != 227)
                count++;
        }
		
		if (seasonCounter == 1 && Game.UpgradesById[645].unlocked == 1) count++; //Valentines last heart

        if (count >= seasonUpgrades[seasonCounter]){
            seasonCounter++;
			SeasonChecker();
		}
    }
	
/*  if (seasonCounter > 4) {
        clearInterval(seasonCheck);
        //seasonCounter = 0;
    }
*/
}

function UpgradeSanta() {
	if (Game.santaLevel >= 14){
        clearInterval(autoSanta);
		CycleSeasons();
	} else {
		if (Buyable(152))
			Game.UpgradesById[152].buy();
		if (Game.UpgradesById[152].bought == 1 && Game.specialTab == '') {
			Game.specialTab = "santa";
			Game.ToggleSpecialMenu(true);
			Game.UpgradeSanta();
			Game.ToggleSpecialMenu(false);
		}
	}
}

function BuyHearts() {
    var count = 0;
    for (i = 169; i <= 174; i++) {
        if (Buyable(i))
            Game.UpgradesById[i].buy();
        if (Game.UpgradesById[i].bought == 1)
            count++;
    }
	
	if (Buyable(645))
		Game.UpgradesById[645].buy();
	if (Game.UpgradesById[645].bought == 1)
		count++;
			
    if (count == 7){
        clearInterval(autoHearts);
		CycleSeasons();
	}
}

function Cast() {
	var cost = grimoire.getSpellCost(grimoire.spells["conjure baked goods"]);
	if (Game.isMinigameReady(Game.Objects["Wizard tower"])) {
		var spellsCast;
		var percent;
		var count = 0;
		while (grimoire.magic >= cost || count < 10) {
			spellsCast = grimoire.spellsCastTotal;
			percent = 1;
			while (percent > .1){
				Math.seedrandom(Game.seed + '/' + spellsCast);
				percent = Math.random();
				Math.seedrandom()
				
				if (percent > .1) Game.seed = Game.makeSeed();
				//console.log(percent);
			}
			grimoire.castSpell(grimoire.spells["conjure baked goods"]);
			count++;
		}
		//grimoire.magic = grimoire.magicM
	}
}

function TrainDragon() {
	if (Buyable(324)) Game.UpgradesById[324].buy()
		
    if (Game.UpgradesById[324].bought == 1 && Game.ObjectsById[Game.ObjectsById.length - 1].amount >= 400){
		autoDragon = setInterval(BuyDragon,(5 * 1000));
		
		if (Game.dragonLevel > 12 && Game.specialTab == '') {
			Game.specialTab = "dragon";
			Game.ToggleSpecialMenu(true);
			Game.SetDragonAura(9,0);
			Game.ConfirmPrompt();
			Game.ToggleSpecialMenu(false);
		}
		if (Game.dragonLevel > Game.dragonLevels.length - 2 && Game.specialTab == '') {
			Game.specialTab = "dragon";
			Game.ToggleSpecialMenu(true);
			Game.SetDragonAura(4,1);
			Game.ConfirmPrompt();
			Game.ToggleSpecialMenu(false);
			
			clearInterval(dragonCheck);
		}
		setTimeout(MarketCheck, (3 * 60 * 1000));
	}
}

function PetDragonCycle(){
	if (Game.dragonLevel >= 8 && !petting){
		if (Game.specialTab == ''){
			dragonUpgrades = Game.Upgrades['Dragon scale'].unlocked + Game.Upgrades['Dragon claw'].unlocked + Game.Upgrades['Dragon fang'].unlocked + Game.Upgrades['Dragon teddy bear'].unlocked
			
			if (dragonUpgrades < 4){
				Game.specialTab = 'dragon';
				Game.ToggleSpecialMenu(true);
				petting = true;
				pettingCount = 0;
				pet = setInterval(PetDragon, 500);
			}else clearInterval(dragonPetCheck);
		}else setTimeout(PetDragonCycle, 60 * 1000);
	}
}

function PetDragon(){
	dragonUpgrades = Game.Upgrades['Dragon scale'].unlocked + Game.Upgrades['Dragon claw'].unlocked + Game.Upgrades['Dragon fang'].unlocked + Game.Upgrades['Dragon teddy bear'].unlocked;
	
	if (Game.specialTab == 'dragon'){
		Game.ClickSpecialPic();
		pettingCount++;
	} else {
		petting = false;
		clearInterval(pet);
		setTimeout(PetDragonCycle, 60 * 1000);
	}
	
	if (dragonUpgrades < (Game.Upgrades['Dragon scale'].unlocked + Game.Upgrades['Dragon claw'].unlocked + Game.Upgrades['Dragon fang'].unlocked + Game.Upgrades['Dragon teddy bear'].unlocked) || pettingCount >= 500) {
		petting = false;
		clearInterval(pet);
		Game.ToggleSpecialMenu(false);
	}
}

function BuyDragon(){
	if (Game.dragonLevel < Game.dragonLevels.length - 1 && Game.specialTab == ''){
		Game.specialTab = "dragon";
		Game.ToggleSpecialMenu(true);
		Game.UpgradeDragon();
		Game.ToggleSpecialMenu(false);
	} else {
		clearInterval(autoDragon);
	}
}

function initializeStocksBought(){
	var arr;
	
	for (var i in StockMarket.goodsById){
		arr = [];
		arr.push(StockMarket.goodsById[i].building.name);	//name
		if (StockMarket.goodsById[i].stock > 0) {  			//stock value
			arr.push(marketAvg[i][0]); //The game doesn't track the price at which you bought stock so we have to just make up a number i.e. the lower stock bound
		} else {
			arr.push(0);
		}
		//arr.push(Rank(i, arr[1]));							//rank - Obsolete
		if (StockMarket.goodsById[i].stock > 0) {  			//stock value
			arr.push(Date.now()); 							//Can't track when you bought stock so we have to just make up a number i.e. now
		} else {
			arr.push(0);
		}
		arr.push(false);									//if traded this tick
		
		stocksBought.push(arr);
	}
}

function getStockPrices(){
	stocksCurrent = [];
	var arr;
	
	for (var i in StockMarket.goodsById){
		arr = []
		arr.push(StockMarket.goodsById[i].building.name);	//name
		arr.push(StockMarket.goodsById[i].val);				//stock value
		//arr.push(Rank(i, arr[1]));						//rank - Obsolete?
		arr.push(Date.now());								//time stock checked
		arr.push(null);										//if traded this tick
		
		stocksCurrent.push(arr);
	}
}

function Rank(stock, value){ //returns rank of stock 1-4.  -1 if error
	var rank = 0;
	var buildingAvgs;
	
	if (stock < marketAvg.length){
		buildingAvgs = marketAvg[stock];
	}else{
		buildingAvgs = [100, 150, 175, 200];
	}
	
	if (0 <= value && value < (buildingAvgs[0] + buildingAvgs[1])/2) {
		rank = 1;
	}else if((buildingAvgs[0] + buildingAvgs[1])/2 <= value && value < (buildingAvgs[1] + buildingAvgs[2])/2){
		rank = 2;
	}else if((buildingAvgs[1] + buildingAvgs[2])/2 <= value && value < (buildingAvgs[2] + buildingAvgs[3])/2){
		rank = 3;
	}else if((buildingAvgs[2] + buildingAvgs[3])/2 <= value){
		rank = 4;
	}else{
		rank = -1;
	}
	
	return rank;
}

function buyTime(stock, value, rank){ //returns difference of value and rank average.  null if error
	var diff = null;
	var buildingAvgs = marketAvg[stock];
	
	if (rank > 0){
		diff = buildingAvgs[rank-1] - value;
	}
	
	return diff;
}

function CheckStockMarket(){ //this function to be run every 60 seconds
	var min;
	var multiplier;
	
	if (StockMarket.brokers < 50) return;
	
	getStockPrices();
	
	for (var i in stocksBought){
		if (stocksBought[i][1] > 0){ //if I own stock.  logic to sell
			if (stocksCurrent[i][1] > marketAvg[i][1] - 1){ //"-1" because the data that was analized was all floored
				stocksBought[i][3] = sellStock(i);
/*			}else if (stocksBought[i][2] - Date.now() > (30 * 60 * 1000) && stocksCurrent[i][1] > marketAvg[i] * 0.9){  //I should add logic here to check if the stock is rising or falling and attempt to not loose as much money so I can hopefully buy again at a lower price.
				stocksBought[i][3] = sellStock(i);
*/			}else{
				stocksBought[i][3] = false;
			}
		}else{ //I don't own stock.  logic to buy
			if (stocksCurrent[i][1] < marketAvg[i][0] + 1){ //"+1" because the data that was analized was all floored
				stocksBought[i][3] = buyStock(i);
			}else stocksBought[i][3] = false;
		}
	}
}

function buyStock(stock){
	var multiplier;
	if (!(stocksBought[stock][3])){ //if stock traded last tick = false
		var amount = StockMarket.getGoodMaxStock(StockMarket.goodsById[stock]); //get max number of stocks
		
		/*switch(stocksCurrent[stock][2]) {
			case 1:
				multiplier =  1;
			break;
			case 2:
				multiplier = 0.66;
			break;
			case 3:
				multiplier = 0.2;
			break;
			default: //possible error might occur here if rank is -1
				multiplier = 0.05;
		}*/
		
		multiplier = 1;
		
		if (StockMarket.buyGood(stock, Math.ceil(amount * multiplier))){ //.buyGood function has price check built in			Math.ceil(amount * 0.5)
			stocksBought[stock][1] = StockMarket.goodsById[stock].val; //store traded stock value
			//stocksBought[stock][2] = Rank(stock, stocksBought[stock][1]); //reset rank - Obsolete
			stocksBought[stock][2] = Date.now(); //store time bought
			//console.log("Bought " + Math.ceil(amount * 0.5) + " shares of " + stocksBought[stock][0] + " at $" + stocksBought[stock][1]);
			return true;
		}
	}
	
	return false;
}

function sellStock(stock){
	if (!(stocksBought[stock][3])){ //if stock traded last tick = false
		StockMarket.sellGood(stock, 10000); //10000 is the built in number used to sell all
		
		//console.log("Sold all shares of " + stocksCurrent[stock][0] + " at $" + stocksCurrent[stock][1]);
		
		stocksBought[stock][1] = 0; //reset traded stock value
		//stocksBought[stock][2] = Rank(stock, 0); //reset rank - Obsolete
		stocksBought[stock][2] = Date.now(); //store time sold
		return true;
	}
	
	return false;
}

function getHCData() {
	var futureChips;

	futureChips = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned)) - Math.floor(Game.HowMuchPrestige(Game.cookiesReset));

	HCdata.push([new Date().getTime(), futureChips]);

	/*
	if (HCdata >= 16) {
		downloadHCCSV();
	}
	*/
}

function downloadHCCSV() {
	clearInterval(collectHCData);
	var csv = "Time,Heavenly Chips\n";
	HCdata.forEach(function (row) {
		csv += row.join(",");
		csv += "\n";
	});

	var hiddenElement = document.createElement('a');
	hiddenElement.href = 'HCdata:text/csv;charset=utf-8,' + encodeURI(csv);
	hiddenElement.target = '_blank';
	hiddenElement.download = 'Heavenly Chips.csv';
	hiddenElement.click();

	HCdata = [];
	collectHCData = setInterval(getHCData, (30 * 60 * 1000));
}

function getSMData() {
	var temp = [];
	
	for (var i in StockMarket.goodsById){
		temp.push(StockMarket.goodsById[i].val);
	}
	
	SMdata.push(temp);
	
	if (SMdata.length >= 1440) downloadStockMarketData();
}

function downloadStockMarketData() {
	clearInterval(collectSMdata);
	var csv;

	for (var i in StockMarket.goodsById){
		csv += StockMarket.goodsById[i].building.name + ",";
	}
	
	csv += "\n";
	
	SMdata.forEach(function (row) {
		csv += row.join(",");
		csv += "\n";
	});

	var hiddenElement = document.createElement('a');
	hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
	hiddenElement.target = '_blank';
	hiddenElement.download = 'Stock Market.csv';
	hiddenElement.click();

	SMdata = [];
	collectSMdata = setInterval(getSMData, (60 * 1000));
}

function Buyable(ID) {
	if (Game.UpgradesById[ID].bought != 1 && Game.UpgradesById[ID].unlocked == 1 && Game.UpgradesById[ID].canBuy()){
		return true;
	} else {
		return false;
	}
}
