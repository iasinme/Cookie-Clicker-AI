//version 8

var buildingList = [];
var upgradeList = [];
var unknownPPUpgrades = [52, 53, 75, 76, 77, 78, 86, 87, 119, 152, 157, 158, 159, 160, 161, 163, 164, 190, 191, 222, 224, 225, 227, 229, 324, 366, 367, 427, 460, 461, 473, 474, 475, 640, 642];
var buildingBought;
var upgradeBought;
var buyingThings = false;
var lowestPP;
var atMarket;
var autoAscensionActive = true;
var seasonCounter = 0;
var autoSanta;
var autoHearts;
var autoBuy;
var autoAscension;
var fortuneCheck;
var seasonCheck;
var noWrinkler;
var autoCast;
var collectData;
var data = [];
//var dataCount = 0;

function startAI() {
    autoBuy = setInterval(goToMarket, (10 * 60 * 1000)); //functioning

    autoAscension = setInterval(autoAscend(false), (24 * 60 * 60 * 1000)); //functioning

    ascensionCheck = setInterval(ascendCheck, (24 * 60 * 60 * 1000)); //functioning

    fortuneCheck = setInterval(clickTicker, (10 * 1000)); //functioning

    seasonCheck = setInterval(cycleSeasons, (30 * 60 * 1000)); //functioning

    noWrinkler = setInterval(Game.CollectWrinklers, (30 * 60 * 1000)); //functioning
	
	autoCast = setInterval(cast, (10*60*1000));
	
	collectData = setInterval(getHCData, (30 * 60 * 1000));

    goldenClick = setInterval(function () { //functioning
            Game.shimmers.forEach(function (shimmer) {
                if (shimmer.type == "golden")
                    shimmer.wrath = 0
                        shimmer.pop()
            })
        }, 500);

    for (var i in Game.ObjectsById) {
        buildingList.push(Game.ObjectsById[i]);
    }
    buildingList.sort();
}

function stopAI() {
    clearInterval(autoBuy);

    clearInterval(autoAscension);

    clearInterval(ascendCheck);

    clearInterval(fortuneCheck);

    clearInterval(seasonCheck);

    clearInterval(noWrinkler);

    clearInterval(goldenClick);

    clearInterval(atMarket);

    clearInterval(autoSanta);

    clearInterval(autoHearts);
	
	clearInterval(autoCast);
	
	clearInterval(collectData);

}

function goToMarket() {
    if (Game.UpgradesById[73].bought == 1) { //last research upgrade
        clearInterval(autoBuy);
        autoBuy = setInterval(goToMarket, (1 * 60 * 60 * 1000));
    } else {
        clearInterval(autoBuy);
        autoBuy = setInterval(goToMarket, (2 * 60 * 1000));
    }

    if (!buyingThings) {
        atMarket = setInterval(buyThings, 10);
        console.log("Going to Market:\n" + new Date().getTime());
    }
}

function buyThings() {
    buyingThings = true;
    buildingBought = false;
    upgradeBought = false;
    var myCookies = Game.cookies;
    lowestPP = indexOfLowestPP();

    if (lowestPP[0] == 0) { //if it's a building
        if (myCookies >= buildingList[lowestPP[1]].getPrice()) {
            buildingList[lowestPP[1]].buy(1);
            myCookies = Game.cookies;
            buildingBought = true;
        }
    } else { //if it's an upgrade
        if (myCookies >= upgradeList[lowestPP[1]].getPrice()) {
            upgradeList[lowestPP[1]].buy(true); //.buy(true) allows me to buy 'One Mind' without pressing the 'ok' button
            myCookies = Game.cookies;
            upgradeBought = true;
        }
    }

    var x;
    for (i in unknownPPUpgrades) {
        x = unknownPPUpgrades[i];
        if (Game.UpgradesById[x].bought != 1 && Game.UpgradesById[x].unlocked == 1 && Game.UpgradesById[x].canBuy())
            Game.UpgradesById[x].buy();
    }

    if ((!buildingBought && !upgradeBought)) {
        clearInterval(atMarket);
        buyingThings = false;
        console.log("Done at Market:\n" + new Date().getTime());
    }
}

function indexOfLowestPP() { //0 for building, 1 for upgrade
    var lowestBuildingIndex = 0;
    var lowestUpgradeIndex = 0;
    resetLists();

    for (var i in buildingList) {
        if (CM.Cache.Objects[buildingList[i].name].pp < CM.Cache.Objects[buildingList[lowestBuildingIndex].name].pp)
            lowestBuildingIndex = i;
    }

    if (upgradeList.length > 0) {
        for (var i in upgradeList) {
            if (CM.Cache.Upgrades[upgradeList[i].name].pp < CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp)
                lowestUpgradeIndex = i;
        }

        if (CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp < 0 || CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp == Infinity) {
            lowestUpgradeIndex = 0;
            console.log("Payback Period was < 0 or == Infinity");
        }

        if (CM.Cache.Objects[buildingList[lowestBuildingIndex].name].pp < CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp)
            return [0, Number(lowestBuildingIndex)];
        if (CM.Cache.Objects[buildingList[lowestBuildingIndex].name].pp > CM.Cache.Upgrades[upgradeList[lowestUpgradeIndex].name].pp)
            return [1, Number(lowestUpgradeIndex)];
    } else {
        return [0, Number(lowestBuildingIndex)];
    }
}

function resetLists() { //creates a list of buildings and viable upgrades
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
            Game.UpgradesInStore[i].id != 333 && //Milk Selector
            Game.UpgradesInStore[i].id != 414 && //Background Selector
            Game.UpgradesInStore[i].id != 227 && //Chocolate Egg
            CM.Cache.Upgrades[Game.UpgradesInStore[i].name].pp >= 0 &&
            CM.Cache.Upgrades[Game.UpgradesInStore[i].name].pp != Infinity)

            upgradeList.push(Game.UpgradesInStore[i]);
    }
    upgradeList.sort();
}

function ascendCheck() { //checks if autoAscension is currently running and turns it on if it's not
    if (!autoAscensionActive) {
        autoAscension = setInterval(autoAscend(false), (24 * 60 * 60 * 1000));
        autoAscensionActive = true;
    }
}

function autoAscend(overide) {
    var futureChips;

    futureChips = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned)) - Math.floor(Game.HowMuchPrestige(Game.cookiesReset));
    if ((futureChips >= Math.pow(10, 12) && autoAscensionActive) || overide) {
        Game.Ascend(true);
        stopAI();
        autoAscensionActive = false;
        setTimeout(function () {
            Game.Reincarnate(true)
        }, (15 * 1000));
        setTimeout(goToMarket, (1 * 60 * 1000));
        seasonCounter = 0;
        setInterval(seasonCheck, (1 * 60 * 60 * 1000));
        startAI();
    }

    /*if ((Game.prestige + futureChips) % 1000000 == 777777){
    Game.Ascend(true);
    clearInterval(autoAscension);
    }*/
}

function clickTicker() {
    if (Game.TickerEffect.type == 'fortune' ||
        Game.Ticker.includes("Today is your lucky day!") ||
        Game.Ticker.includes("Your lucky numbers are : ")) {
        Game.tickerL.click();
    }
    /*else {
    Game.getNewTicker(false);
    }*/
}

function cycleSeasons() {
    seasonChecker();
    //seasonCounter 0:1st Christmas, 1:Valentines, 2:Easter, 3:2nd Christmas, 4:Halloween
    if (seasonCounter == 0 && Game.UpgradesById[182].canBuy() && Game.season != "christmas") {
        Game.UpgradesById[182].buy(); //Christmas
        autoSanta = setInterval(upgradeSanta, (5 * 1000));
    } else if (seasonCounter == 1 && Game.UpgradesById[184].canBuy() && Game.season != "valentines") {
        Game.UpgradesById[184].buy(); //Valentines
        autoHearts = setInterval(buyHearts, (5 * 1000));
    } else if (seasonCounter == 2 && Game.UpgradesById[209].canBuy() && Game.season != "easter") {
        Game.UpgradesById[209].buy(); //Easter
    } else if (seasonCounter == 3 && Game.UpgradesById[182].canBuy() && Game.season != "christmas") {
        Game.UpgradesById[182].buy(); //Christmas
    } else if (seasonCounter == 4 && Game.UpgradesById[183].canBuy() && Game.season != "halloween") {
        Game.UpgradesById[183].buy(); //Halloween
    } else {
        clearInterval(seasonCheck);
    }
}

function seasonChecker() {
    var count = 0;
    var bound;
    var seasonUpgrades = [16, 6, 20, 7, 7];
    if (seasonCounter == 0)
        bound = [152, 168];
    if (seasonCounter == 1)
        bound = [169, 174];
    if (seasonCounter == 2)
        bound = [210, 229];
    if (seasonCounter == 3)
        bound = [143, 149];
    if (seasonCounter == 4)
        bound = [134, 140];

    if (seasonCounter <= 4) {
        for (i = bound[0]; i <= bound[1]; i++) {
            if (Game.UpgradesById[i].unlocked == 1 && i != 167)
                count++;
        }

        if (count == seasonUpgrades[seasonCounter])
            seasonCounter++;
    }
    if (seasonCounter > 4) {
        clearInterval(seasonCheck);
        seasonCounter = 0;
    }
}

function upgradeSanta() {
    if (Game.UpgradesById[152].bought != 1 && Game.UpgradesById[152].unlocked == 1 && Game.UpgradesById[152].canBuy())
        Game.UpgradesById[152].buy();
    if (Game.UpgradesById[152].bought == 1) {
        Game.specialTab = "santa";
        Game.UpgradeSanta();
        Game.ToggleSpecialMenu();
    }
    if (Game.santaLevel >= 14)
        clearInterval(autoSanta);
    cycleSeasons();
}

function buyHearts() {
    var count = 0;
    for (i = 169; i <= 174; i++) {
        if (Game.UpgradesById[i].bought != 1 && Game.UpgradesById[i].unlocked == 1 && Game.UpgradesById[i].canBuy())
            Game.UpgradesById[i].buy();
        if (Game.UpgradesById[i].bought == 1)
            count++;
    }
    if (count == 6)
        clearInterval(autoHearts);
    cycleSeasons();
}

function cast(){
	var grimoire=Game.ObjectsById[7].minigame;
	var cost = grimoire.getSpellCost(grimoire.spells['conjure baked goods']);
	with (Game) {
		var spellOutcome = "";
		if (isMinigameReady(Objects["Wizard tower"])) {
			var spellsCast = Objects["Wizard tower"].minigame.spellsCastTotal;
			var target = spellsCast + 10;
			while (spellOutcome != "SSSSSSSSSS") {
				while (spellsCast < target) {
					Math.seedrandom(Game.seed + '/' + M.spellsCastTotal);
					spellOutcome += Math.random()<0.85?"S":"B"
					spellsCast+=1
					Math.seedrandom()
				}
				//console.log(Game.seed + " : " + spellOutcome)
				if (spellOutcome != "SSSSSSSSSS"){
					Game.seed=Game.makeSeed();
					spellsCast = Objects["Wizard tower"].minigame.spellsCastTotal;
					spellOutcome = "";
				}
			}
		}
	}
	
	while (grimoire.magic >= cost) {
		grimoire.castSpell(grimoire.spells['conjure baked goods']);
	}
}

function getHCData() {
	var futureChips;

	futureChips = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned)) - Math.floor(Game.HowMuchPrestige(Game.cookiesReset));

	data.push([new Date().getTime(), futureChips]);

	/*if (dataCount >= 16) {
	clearInterval(collectData);
	downloadCSV();
	} else {
	dataCount++;
	}*/
}

function downloadCSV() {
	clearInterval(collectData);
	var csv = "Time,Heavenly Chips\n";
	data.forEach(function (row) {
		csv += row.join(",");
		csv += "\n";
	});

	var hiddenElement = document.createElement('a');
	hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
	hiddenElement.target = '_blank';
	hiddenElement.download = 'Heavenly Chips.csv';
	hiddenElement.click();

	data = [];
	collectData = setInterval(getHCData, (30 * 60 * 1000));
}