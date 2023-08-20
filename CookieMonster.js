/* eslint-disable no-unused-vars */
/**
 * Header *
 */

const CM = {
	Backup: {},
	Cache: {},
	Config: {},
	Data: { Config: {} },
	Disp: {},
	Footer: {},
	Main: {},
	Options: {},
	Sim: {},
	VersionMajor: '2.031',
	VersionMinor: '4',
};
/**
 * Cache *
 */

/**
 * Section: General Cache related functions */

/**
 * This functions runs all cache-functions to generate all "full" cache
 * The declaration follows the structure of the CM.Cache.js file
 * It is called by CM.Main.DelayInit
 */
CM.Cache.InitCache = function () {
	CM.Cache.CacheDragonAuras();
	CM.Cache.CacheWrinklers();
	CM.Cache.CacheStats();
	CM.Cache.CacheGoldenAndWrathCookiesMults();
	CM.Cache.CacheChain();
	CM.Cache.CacheMissingUpgrades();
	CM.Cache.CacheSeaSpec();
	CM.Cache.InitCookiesDiff();
	CM.Cache.HeavenlyChipsDiff = new CMAvgQueue(5); // Used by CM.Cache.CacheHeavenlyChipsPS()
	CM.Cache.CacheHeavenlyChipsPS();
	CM.Cache.CacheAvgCPS();
	CM.Cache.CacheIncome();
	CM.Cache.CacheBuildingsPrices();
	CM.Cache.CachePP();
};

/**
 * This functions caches variables that are needed every loop
 * It is called by CM.Main.Loop()
 * @global	{string}	CM.Cache.TimeTillNextPrestige	Time requried till next prestige level
 */
CM.Cache.LoopCache = function () {
	// Update Wrinkler Bank
	CM.Cache.CacheWrinklers();

	CM.Cache.CachePP();
	CM.Cache.CacheCurrWrinklerCPS();
	CM.Cache.CacheAvgCPS();
	CM.Cache.CacheHeavenlyChipsPS();

	const cookiesToNext = Game.HowManyCookiesReset(Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned)) + 1) - (Game.cookiesEarned + Game.cookiesReset);
	CM.Cache.TimeTillNextPrestige = CM.Disp.FormatTime(cookiesToNext / CM.Disp.GetCPS());
};

/**
 * Section: Helper functions */

/**
 * @class
 * @classdesc 	This is a class used to store values used to calculate average over time (mostly cps)
 * @var			{number}				maxLength	The maximum length of the value-storage
 * @var			{[]}					queue		The values stored
 * @method		addLatest(newValue)		Appends newValue to the value storage
 * @method		calcAverage(timePeriod)	Returns the average over the specified timeperiod
 */
class CMAvgQueue {
	constructor(maxLength) {
		this.maxLength = maxLength;
		this.queue = [];
	}

	addLatest(newValue) {
		if (this.queue.push(newValue) > this.maxLength) {
			this.queue.shift();
		}
	}

	/**
	 * This functions returns the average of the values in the queue
	 * @param 	{number}	timePeriod	The period in seconds to computer average over
	 * @returns {number}	ret			The average
 	 */
	calcAverage(timePeriod) {
		if (timePeriod > this.maxLength) timePeriod = this.maxLength;
		if (timePeriod > this.queue.length) timePeriod = this.queue.length;
		let ret = 0;
		for (let i = this.queue.length - 1; i >= 0 && i > this.queue.length - 1 - timePeriod; i--) {
			ret += this.queue[i];
		}
		return ret / timePeriod;
	}
}

/**
 * Section: Functions related to Dragon Auras */

/**
 * This functions caches the currently selected Dragon Auras
 * It is called by CM.Sim.CopyData() and CM.Cache.InitCache()
 * Uncapitalized dragon follows Game-naming
 * @global	{number}	CM.Cache.dragonAura		The number of the first (right) Aura
 * @global	{number}	CM.Cache.dragonAura2	The number of the second (left) Aura
 */
CM.Cache.CacheDragonAuras = function () {
	CM.Cache.dragonAura = Game.dragonAura;
	CM.Cache.dragonAura2 = Game.dragonAura2;
};

/**
 * Section: Functions related to Wrinklers */

/**
 * This functions caches data related to Wrinklers
 * It is called by CM.Cache.LoopCache() and CM.Cache.InitCache()
 * @global	{number}				CM.Cache.WrinklersTotal		The cookies of all wrinklers
 * @global	{number}				CM.Cache.WrinklersNormal	The cookies of all normal wrinklers
 * @global	{[{number}, {number}]}	CM.Cache.WrinklersFattest	A list containing the cookies and the id of the fattest non-shiny wrinkler
 */
CM.Cache.CacheWrinklers = function () {
	CM.Cache.WrinklersTotal = 0;
	CM.Cache.WrinklersNormal = 0;
	CM.Cache.WrinklersFattest = [0, null];
	for (let i = 0; i < Game.wrinklers.length; i++) {
		let sucked = Game.wrinklers[i].sucked;
		let toSuck = 1.1;
		if (Game.Has('Sacrilegious corruption')) toSuck *= 1.05;
		if (Game.wrinklers[i].type === 1) toSuck *= 3; // Shiny wrinklers
		sucked *= toSuck;
		if (Game.Has('Wrinklerspawn')) sucked *= 1.05;
		if (CM.Sim.Objects.Temple.minigameLoaded) {
			const godLvl = Game.hasGod('scorn');
			if (godLvl === 1) sucked *= 1.15;
			else if (godLvl === 2) sucked *= 1.1;
			else if (godLvl === 3) sucked *= 1.05;
		}
		CM.Cache.WrinklersTotal += sucked;
		if (Game.wrinklers[i].type === 0) {
			CM.Cache.WrinklersNormal += sucked;
			if (sucked > CM.Cache.WrinklersFattest[0]) CM.Cache.WrinklersFattest = [sucked, i];
		}
	}
};

/**
 * Section: Functions related to Caching stats */

/**
 * This functions caches variables related to the stats page
 * It is called by CM.Main.Loop() upon changes to cps and CM.Cache.InitCache()
 * @global	{number}	CM.Cache.Lucky					Cookies required for max Lucky
 * @global	{number}	CM.Cache.LuckyReward			Reward for max normal Lucky
 * @global	{number}	CM.Cache.LuckyWrathReward		Reward for max normal Lucky from Wrath cookie
 * @global	{number}	CM.Cache.LuckyFrenzy			Cookies required for max Lucky Frenzy
 * @global	{number}	CM.Cache.LuckyRewardFrenzy		Reward for max Lucky Frenzy
 * @global	{number}	CM.Cache.LuckyWrathRewardFrenzy	Reward for max Lucky Frenzy from Wrath cookie
 * @global	{number}	CM.Cache.Conjure				Cookies required for max Conjure Baked Goods
 * @global	{number}	CM.Cache.ConjureReward			Reward for max Conjure Baked Goods
 * @global	{number}	CM.Cache.Edifice				Cookies required for most expensive building through Spontaneous Edifice
 * @global	{string}	CM.Cache.EdificeBuilding		Name of most expensive building possible with Spontaneous Edifice
 */
CM.Cache.CacheStats = function () {
	CM.Cache.Lucky = (CM.Cache.NoGoldSwitchCookiesPS * 900) / 0.15;
	CM.Cache.Lucky *= CM.Cache.DragonsFortuneMultAdjustment;
	const cpsBuffMult = CM.Cache.getCPSBuffMult();
	if (cpsBuffMult > 0) CM.Cache.Lucky /= cpsBuffMult;
	else CM.Cache.Lucky = 0;
	CM.Cache.LuckyReward = CM.Cache.GoldenCookiesMult * (CM.Cache.Lucky * 0.15) + 13;
	CM.Cache.LuckyWrathReward = CM.Cache.WrathCookiesMult * (CM.Cache.Lucky * 0.15) + 13;
	CM.Cache.LuckyFrenzy = CM.Cache.Lucky * 7;
	CM.Cache.LuckyRewardFrenzy = CM.Cache.GoldenCookiesMult * (CM.Cache.LuckyFrenzy * 0.15) + 13;
	CM.Cache.LuckyWrathRewardFrenzy = CM.Cache.WrathCookiesMult * (CM.Cache.LuckyFrenzy * 0.15) + 13;
	CM.Cache.Conjure = CM.Cache.Lucky * 2;
	CM.Cache.ConjureReward = CM.Cache.Conjure * 0.15;

	CM.Cache.Edifice = 0;
	let max = 0;
	let n = 0;
	for (const i of Object.keys(Game.Objects)) {
		if (Game.Objects[i].amount > max) max = Game.Objects[i].amount;
		if (Game.Objects[i].amount > 0) n++;
	}
	for (const i of Object.keys(Game.Objects)) {
		if ((Game.Objects[i].amount < max || n === 1)
			&& Game.Objects[i].amount < 400
			&& Game.Objects[i].price * 2 > CM.Cache.Edifice) {
			CM.Cache.Edifice = Game.Objects[i].price * 2;
			CM.Cache.EdificeBuilding = i;
		}
	}
};

/**
 * This functions calculates the multipliers of Golden and Wrath cookie rewards
 * It is mostly used by CM.Cache.MaxChainCookieReward() and CM.Cache.CacheChain()
 * It is called by CM.Disp.CreateStatsChainSection() and CM.Cache.CacheChain()
 * @param	{number}			CM.Cache.GoldenCookiesMult				Multiplier for golden cookies
 * @param	{number}			CM.Cache.WrathCookiesMult				Multiplier for wrath cookies
 * @param	{number}			CM.Cache.DragonsFortuneMultAdjustment	Multiplier for dragon fortune + active golden cookie
 */
CM.Cache.CacheGoldenAndWrathCookiesMults = function () {
	if (CM.Footer.isInitzializing) {
		CM.Cache.GoldenCookiesMult = 1;
		CM.Cache.WrathCookiesMult = 1;
		CM.Cache.DragonsFortuneMultAdjustment = 1;
	} else {
		let goldenMult = 1;
		let wrathMult = 1;
		let mult = 1;

		// Factor auras and upgrade in mults
		if (CM.Sim.Has('Green yeast digestives')) mult *= 1.01;
		if (CM.Sim.Has('Dragon fang')) mult *= 1.03;

		goldenMult *= 1 + Game.auraMult('Ancestral Metamorphosis') * 0.1;
		goldenMult *= Game.eff('goldenCookieGain');
		wrathMult *= 1 + Game.auraMult('Unholy Dominion') * 0.1;
		wrathMult *= Game.eff('wrathCookieGain');

		// Calculate final golden and wrath multipliers
		CM.Cache.GoldenCookiesMult = mult * goldenMult;
		CM.Cache.WrathCookiesMult = mult * wrathMult;

		// Calculate Dragon's Fortune multiplier adjustment:
		// If Dragon's Fortune (or Reality Bending) aura is active and there are currently no golden cookies,
		// compute a multiplier adjustment to apply on the current CPS to simulate 1 golden cookie on screen.
		// Otherwise, the aura effect will be factored in the base CPS making the multiplier not requiring adjustment.
		CM.Cache.DragonsFortuneMultAdjustment = 1;
		if (Game.shimmerTypes.golden.n === 0) {
			CM.Cache.DragonsFortuneMultAdjustment *= 1 + Game.auraMult('Dragon\'s Fortune') * 1.23;
		}
	}
};

/**
 * This functions calculates the max possible payout given a set of variables
 * It is called by CM.Disp.CreateStatsChainSection() and CM.Cache.CacheChain()
 * @param	{number}					digit		Number of Golden Cookies in chain
 * @param	{number}					maxPayout	Maximum payout
 * @param	{number}					mult		Multiplier
 * @returns	[{number, number, number}]				Total cookies earned, cookie needed for this and next level
 */
CM.Cache.MaxChainCookieReward = function (digit, maxPayout, mult) {
	let totalFromChain = 0;
	let moni = 0;
	let nextMoni = 0;
	let nextRequired = 0;
	let chain = 1 + Math.max(0, Math.ceil(Math.log(Game.cookies) / Math.LN10) - 10);
	while (nextMoni < maxPayout) {
		moni = Math.max(digit, Math.min(Math.floor(1 / 9 * 10 ** chain * digit * mult), maxPayout * mult));
		nextMoni = Math.max(digit, Math.min(Math.floor(1 / 9 * 10 ** (chain + 1) * digit * mult), maxPayout * mult));
		nextRequired = Math.floor(1 / 9 * 10 ** (chain + 1) * digit * mult);
		totalFromChain += moni;
		chain++;
	}
	return [totalFromChain, moni, nextRequired];
};

/**
 * This functions caches data related to Chain Cookies reward from Golden Cookioes
 * It is called by CM.Main.Loop() upon changes to cps and CM.Cache.InitCache()
 * @global	[{number, number}]	CM.Cache.ChainMaxReward			Total cookies earned, and cookies needed for next level for normal chain
 * @global	{number}			CM.Cache.ChainRequired			Cookies needed for maximum reward for normal chain
 * @global	{number}			CM.Cache.ChainRequiredNext		Total cookies needed for next level for normal chain
 * @global	[{number, number}]	CM.Cache.ChainMaxWrathReward			Total cookies earned, and cookies needed for next level for wrath chain
 * @global	{number}			CM.Cache.ChainWrathRequired			Cookies needed for maximum reward for wrath chain
 * @global	{number}			CM.Cache.ChainWrathRequiredNext		Total cookies needed for next level for wrath chain
 * @global	[{number, number}]	CM.Cache.ChainFrenzyMaxReward			Total cookies earned, and cookies needed for next level for normal frenzy chain
 * @global	{number}			CM.Cache.ChainFrenzyRequired			Cookies needed for maximum reward for normal frenzy chain
 * @global	{number}			CM.Cache.ChainFrenzyRequiredNext		Total cookies needed for next level for normal frenzy chain
 * @global	[{number, number}]	CM.Cache.ChainFrenzyWrathMaxReward			Total cookies earned, and cookies needed for next level for wrath frenzy chain
 * @global	{number}			CM.Cache.ChainFrenzyWrathRequired			Cookies needed for maximum reward for wrath frenzy chain
 * @global	{number}			CM.Cache.ChainFrenzyWrathRequiredNext		Total cookies needed for next level for wrath frenzy chain
 */
CM.Cache.CacheChain = function () {
	let maxPayout = CM.Cache.NoGoldSwitchCookiesPS * 60 * 60 * 6 * CM.Cache.DragonsFortuneMultAdjustment;
	// Removes effect of Frenzy etc.
	const cpsBuffMult = CM.Cache.getCPSBuffMult();
	if (cpsBuffMult > 0) maxPayout /= cpsBuffMult;
	else maxPayout = 0;

	CM.Cache.ChainMaxReward = CM.Cache.MaxChainCookieReward(7, maxPayout, CM.Cache.GoldenCookiesMult);
	CM.Cache.ChainRequired = CM.Cache.ChainMaxReward[1] * 2 / CM.Cache.GoldenCookiesMult;
	CM.Cache.ChainRequiredNext = CM.Cache.ChainMaxReward[2] / 60 / 60 / 6 / CM.Cache.DragonsFortuneMultAdjustment;

	CM.Cache.ChainMaxWrathReward = CM.Cache.MaxChainCookieReward(6, maxPayout, CM.Cache.WrathCookiesMult);
	CM.Cache.ChainWrathRequired = CM.Cache.ChainMaxWrathReward[1] * 2 / CM.Cache.WrathCookiesMult;
	CM.Cache.ChainWrathRequiredNext = CM.Cache.ChainMaxWrathReward[2] / 60 / 60 / 6 / CM.Cache.DragonsFortuneMultAdjustment;

	CM.Cache.ChainFrenzyMaxReward = CM.Cache.MaxChainCookieReward(7, maxPayout * 7, CM.Cache.GoldenCookiesMult);
	CM.Cache.ChainFrenzyRequired = CM.Cache.ChainFrenzyMaxReward[1] * 2 / CM.Cache.GoldenCookiesMult;
	CM.Cache.ChainFrenzyRequiredNext = CM.Cache.ChainFrenzyMaxReward[2] / 60 / 60 / 6 / CM.Cache.DragonsFortuneMultAdjustment;

	CM.Cache.ChainFrenzyMaxWrathReward = CM.Cache.MaxChainCookieReward(6, maxPayout * 7, CM.Cache.WrathCookiesMult);
	CM.Cache.ChainFrenzyWrathRequired = CM.Cache.ChainFrenzyMaxWrathReward[1] * 2 / CM.Cache.WrathCookiesMult;
	CM.Cache.ChainFrenzyWrathRequiredNext = CM.Cache.ChainFrenzyMaxWrathReward[2] / 60 / 60 / 6 / CM.Cache.DragonsFortuneMultAdjustment;
};

/**
 * This functions caches variables related to missing upgrades
 * It is called by CM.Main.Loop() and CM.Cache.InitCache()
 * @global	{string}	CM.Cache.MissingUpgrades			String containig the HTML to create the "crates" for missing normal upgrades
 * @global	{string}	CM.Cache.MissingUpgradesCookies		String containig the HTML to create the "crates" for missing cookie upgrades
 * @global	{string}	CM.Cache.MissingUpgradesPrestige	String containig the HTML to create the "crates" for missing prestige upgrades
 */
CM.Cache.CacheMissingUpgrades = function () {
	CM.Cache.MissingUpgrades = '';
	CM.Cache.MissingUpgradesCookies = '';
	CM.Cache.MissingUpgradesPrestige = '';
	const list = [];
	// sort the upgrades
	for (const i of Object.keys(Game.Upgrades)) {
		list.push(Game.Upgrades[i]);
	}
	const sortMap = function (a, b) {
		if (a.order > b.order) return 1;
		else if (a.order < b.order) return -1;
		return 0;
	};
	list.sort(sortMap);

	for (const i of Object.keys(list)) {
		const me = list[i];

		if (me.bought === 0) {
			let str = '';

			str += CM.Disp.crateMissing(me);
			if (me.pool === 'prestige') CM.Cache.MissingUpgradesPrestige += str;
			else if (me.pool === 'cookie') CM.Cache.MissingUpgradesCookies += str;
			else if (me.pool !== 'toggle' && me.pool !== 'unused' && me.pool !== 'debug') CM.Cache.MissingUpgrades += str;
		}
	}
};

/**
 * This functions caches the reward of popping a reindeer
 * It is called by CM.Main.Loop() and CM.Cache.InitCache()
 * @global	{number}	CM.Cache.SeaSpec	The reward for popping a reindeer
 */
CM.Cache.CacheSeaSpec = function () {
	if (Game.season === 'christmas') {
		let val = Game.cookiesPs * 60;
		if (Game.hasBuff('Elder frenzy')) val *= 0.5;
		if (Game.hasBuff('Frenzy')) val *= 0.75;
		CM.Cache.SeaSpec = Math.max(25, val);
		if (Game.Has('Ho ho ho-flavored frosting')) CM.Cache.SeaSpec *= 2;
	}
};

/**
 * This functions caches the heavenly chips per second in the last five seconds
 * It is called by CM.Cache.LoopCache()
 * @global	{number}	CM.Cache.HCPerSecond	The Heavenly Chips per second in the last five seconds
 */
CM.Cache.CacheHeavenlyChipsPS = function () {
	CM.Cache.HCPerSecond = 0; // Mainly there to not throw errors during initialization
	const currDate = Math.floor(Date.now() / 1000);
	// Only calculate every new second
	if ((Game.T / Game.fps) % 1 === 0) {
		const chipsOwned = Game.HowMuchPrestige(Game.cookiesReset);
		const ascendNowToOwn = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned));
		const ascendNowToGet = ascendNowToOwn - Math.floor(chipsOwned);

		// Add recent gains to AvgQueue's
		const timeDiff = currDate - CM.Cache.lastHeavenlyCheck;
		const heavenlyChipsDiffAvg = Math.max(0, (ascendNowToGet - CM.Cache.lastHeavenlyChips)) / timeDiff;
		for (let i = 0; i < timeDiff; i++) {
			CM.Cache.HeavenlyChipsDiff.addLatest(heavenlyChipsDiffAvg);
		}

		// Store current data for next loop
		CM.Cache.lastHeavenlyCheck = currDate;
		CM.Cache.lastHeavenlyChips = ascendNowToGet;

		// Get average gain over period of 5 seconds
		CM.Cache.HCPerSecond = CM.Cache.HeavenlyChipsDiff.calcAverage(5);
	}
};

/**
 * Section: Functions related to caching CPS */

/**
 * This functions caches creates the CMAvgQueue used by CM.Cache.CacheAvgCPS() to calculate CPS
 * Called by CM.Cache.InitCache()
 */
CM.Cache.InitCookiesDiff = function () {
	CM.Cache.CookiesDiff = new CMAvgQueue(CM.Disp.cookieTimes[CM.Disp.cookieTimes.length - 1]);
	CM.Cache.WrinkDiff = new CMAvgQueue(CM.Disp.cookieTimes[CM.Disp.cookieTimes.length - 1]);
	CM.Cache.WrinkFattestDiff = new CMAvgQueue(CM.Disp.cookieTimes[CM.Disp.cookieTimes.length - 1]);
	CM.Cache.ChoEggDiff = new CMAvgQueue(CM.Disp.cookieTimes[CM.Disp.cookieTimes.length - 1]);
	CM.Cache.ClicksDiff = new CMAvgQueue(CM.Disp.clickTimes[CM.Disp.clickTimes.length - 1]);
};

/**
 * This functions caches two variables related average CPS and Clicks
 * It is called by CM.Cache.LoopCache()
 * @global	{number}	CM.Cache.RealCookiesEarned	Cookies earned including the Chocolate Egg
 * @global	{number}	CM.Cache.AvgCPS				Average cookies over time-period as defined by AvgCPSHist
 * @global	{number}	CM.Cache.AverageClicks		Average cookies from clicking over time-period as defined by AvgClicksHist
 * @global	{number}	CM.Cache.AvgCPSChoEgg		Average cookies from combination of normal CPS and average Chocolate Cookie CPS
 */
CM.Cache.CacheAvgCPS = function () {
	const currDate = Math.floor(Date.now() / 1000);
	// Only calculate every new second
	if ((Game.T / Game.fps) % 1 === 0) {
		let choEggTotal = Game.cookies + CM.Cache.SellForChoEgg;
		if (Game.cpsSucked > 0) choEggTotal += CM.Cache.WrinklersTotal;
		CM.Cache.RealCookiesEarned = Math.max(Game.cookiesEarned, choEggTotal);
		choEggTotal *= 0.05;

		// Add recent gains to AvgQueue's
		const timeDiff = currDate - CM.Cache.lastCPSCheck;
		const bankDiffAvg = Math.max(0, (Game.cookies - CM.Cache.lastCookies)) / timeDiff;
		const wrinkDiffAvg = Math.max(0, (CM.Cache.WrinklersTotal - CM.Cache.lastWrinkCookies)) / timeDiff;
		const wrinkFattestDiffAvg = Math.max(0, (CM.Cache.WrinklersFattest[0] - CM.Cache.lastWrinkFattestCookies)) / timeDiff;
		const choEggDiffAvg = Math.max(0, (choEggTotal - CM.Cache.lastChoEgg)) / timeDiff;
		const clicksDiffAvg = (Game.cookieClicks - CM.Cache.lastClicks) / timeDiff;
		for (let i = 0; i < timeDiff; i++) {
			CM.Cache.CookiesDiff.addLatest(bankDiffAvg);
			CM.Cache.WrinkDiff.addLatest(wrinkDiffAvg);
			CM.Cache.WrinkFattestDiff.addLatest(wrinkFattestDiffAvg);
			CM.Cache.ChoEggDiff.addLatest(choEggDiffAvg);
			CM.Cache.ClicksDiff.addLatest(clicksDiffAvg);
		}

		// Store current data for next loop
		CM.Cache.lastCPSCheck = currDate;
		CM.Cache.lastCookies = Game.cookies;
		CM.Cache.lastWrinkCookies = CM.Cache.WrinklersTotal;
		CM.Cache.lastWrinkFattestCookies = CM.Cache.WrinklersFattest[0];
		CM.Cache.lastChoEgg = choEggTotal;
		CM.Cache.lastClicks = Game.cookieClicks;

		// Get average gain over period of cpsLength seconds
		const cpsLength = CM.Disp.cookieTimes[CM.Options.AvgCPSHist];
		CM.Cache.AverageGainBank = CM.Cache.CookiesDiff.calcAverage(cpsLength);
		CM.Cache.AverageGainWrink = CM.Cache.WrinkDiff.calcAverage(cpsLength);
		CM.Cache.AverageGainWrinkFattest = CM.Cache.WrinkFattestDiff.calcAverage(cpsLength);
		CM.Cache.AverageGainChoEgg = CM.Cache.ChoEggDiff.calcAverage(cpsLength);
		CM.Cache.AvgCPS = CM.Cache.AverageGainBank;
		if (CM.Options.CalcWrink === 1) CM.Cache.AvgCPS += CM.Cache.AverageGainWrink;
		if (CM.Options.CalcWrink === 2) CM.Cache.AvgCPS += CM.Cache.AverageGainWrinkFattest;

		const choEgg = (Game.HasUnlocked('Chocolate egg') && !Game.Has('Chocolate egg'));

		if (choEgg || CM.Options.CalcWrink === 0) {
			CM.Cache.AvgCPSWithChoEgg = CM.Cache.AverageGainBank + CM.Cache.AverageGainWrink + (choEgg ? CM.Cache.AverageGainChoEgg : 0);
		} else CM.Cache.AvgCPSWithChoEgg = CM.Cache.AvgCPS;

		CM.Cache.AverageClicks = CM.Cache.ClicksDiff.calcAverage(CM.Disp.clickTimes[CM.Options.AvgClicksHist]);
	}
};

/**
 * This functions caches the reward for selling the Chocolate egg
 * It is called by CM.Main.Loop()
 * @global	{number}	CM.Cache.SellForChoEgg	Total cookies to be gained from selling Chocolate egg
 */
CM.Cache.CacheSellForChoEgg = function () {
	let sellTotal = 0;
	// Compute cookies earned by selling stock market goods
	if (Game.Objects.Bank.minigameLoaded) {
		const marketGoods = Game.Objects.Bank.minigame.goods;
		let goodsVal = 0;
		for (const i of Object.keys(marketGoods)) {
			const marketGood = marketGoods[i];
			goodsVal += marketGood.stock * marketGood.val;
		}
		sellTotal += goodsVal * Game.cookiesPsRawHighest;
	}
	// Compute cookies earned by selling all buildings with optimal auras (ES + RB)
	sellTotal += CM.Sim.SellBuildingsForChoEgg();
	CM.Cache.SellForChoEgg = sellTotal;
};

/**
 * This functions caches the current Wrinkler CPS multiplier
 * It is called by CM.Cache.LoopCache(). Variables are mostly used by CM.Disp.GetCPS().
 * @global	{number}	CM.Cache.CurrWrinklerCount		Current number of wrinklers
 * @global	{number}	CM.Cache.CurrWrinklerCPSMult	Current multiplier of CPS because of wrinklers (excluding their negative sucking effect)
 */
CM.Cache.CacheCurrWrinklerCPS = function () {
	CM.Cache.CurrWrinklerCPSMult = 0;
	let count = 0;
	for (const i in Game.wrinklers) {
		if (Game.wrinklers[i].phase === 2) count++;
	}
	let godMult = 1;
	if (CM.Sim.Objects.Temple.minigameLoaded) {
		const godLvl = Game.hasGod('scorn');
		if (godLvl === 1) godMult *= 1.15;
		else if (godLvl === 2) godMult *= 1.1;
		else if (godLvl === 3) godMult *= 1.05;
	}
	CM.Cache.CurrWrinklerCount = count;
	CM.Cache.CurrWrinklerCPSMult = count * (count * 0.05 * 1.1) * (Game.Has('Sacrilegious corruption') * 0.05 + 1) * (Game.Has('Wrinklerspawn') * 0.05 + 1) * godMult;
};

/**
 * This function returns the current CPS buff
 * It is called by CM.Sim.CalculateGains(), CM.Disp.UpdateTooltipWarnings(), CM.Cache.CacheStats() and CM.Cache.CacheChain()
 * @returns {number}	mult	The multiplier
 */
CM.Cache.getCPSBuffMult = function () {
	let mult = 1;
	for (const i of Object.keys(Game.buffs)) {
		if (typeof Game.buffs[i].multCpS !== 'undefined') mult *= Game.buffs[i].multCpS;
	}
	return mult;
};

/**
 * This function calculates CPS without the Golden Switch as it might be needed in other functions
 * If so it CM.Sim.Win()'s them and the caller function will know to recall CM.Sim.CalculateGains()
 * It is called at the end of any functions that simulates certain behaviour
 */
CM.Cache.NoGoldSwitchCPS = function () {
	if (Game.Has('Golden switch [off]')) {
		CM.Cache.NoGoldSwitchCookiesPS = CM.Sim.NoGoldSwitchCPS();
	} else CM.Cache.NoGoldSwitchCookiesPS = Game.cookiesPs;
};

/**
 * Section: Functions related to "Specials" (Dragon and Santa) */

/**
 * This functions caches the current cost of upgrading the dragon level so it can be displayed in the tooltip
 * It is called by the relevan tooltip-code as a result of CM.Disp.AddDragonLevelUpTooltip() and by CM.Main.Loop()
 * @global	{number}	CM.Cache.lastDragonLevel		The last cached dragon level
 * @global	{string}	CM.Cache.CostDragonUpgrade		The Beautified cost of the next upgrade
 */
CM.Cache.CacheDragonCost = function () {
	if (CM.Cache.lastDragonLevel !== Game.dragonLevel || CM.Sim.DoSims) {
		if (Game.dragonLevel < 25 && Game.dragonLevels[Game.dragonLevel].buy.toString().includes('sacrifice')) {
			const objectMatch = Game.dragonLevels[Game.dragonLevel].buy.toString().match(/Objects\[(.*)\]/);
			let target = objectMatch !== null ? objectMatch[1] : Game.ObjectsById[Game.dragonLevel - 5].name;
			//Game.dragonLevels[Game.dragonLevel].buy.toString().match(/Objects\[(.*)\]/)[1];
			const amount = Game.dragonLevels[Game.dragonLevel].buy.toString().match(/sacrifice\((.*?)\)/)[1];
			if (target !== 'i') {
				target = target.replaceAll("'", '');
				if (Game.Objects[target].amount < amount) {
					CM.Cache.CostDragonUpgrade = 'Not enough buildings to sell';
				} else {
					let cost = 0;
					CM.Sim.CopyData();
					for (let i = 0; i < amount; i++) {
						let price = CM.Sim.Objects[target].basePrice * Game.priceIncrease ** Math.max(0, CM.Sim.Objects[target].amount - 1 - CM.Sim.Objects[target].free);
						price = Game.modifyBuildingPrice(CM.Sim.Objects[target], price);
						price = Math.ceil(price);
						cost += price;
						CM.Sim.Objects[target].amount--;
					}
					CM.Cache.CostDragonUpgrade = `Cost to rebuy: ${CM.Disp.Beautify(cost)}`;
				}
			} else {
				let cost = 0;
				CM.Sim.CopyData();
				for (const j of Object.keys(Game.Objects)) {
					target = j;
					if (Game.Objects[target].amount < amount) {
						CM.Cache.CostDragonUpgrade = 'Not enough buildings to sell';
						break;
					} else {
						for (let i = 0; i < amount; i++) {
							let price = CM.Sim.Objects[target].basePrice * Game.priceIncrease ** Math.max(0, CM.Sim.Objects[target].amount - 1 - CM.Sim.Objects[target].free);
							price = Game.modifyBuildingPrice(CM.Sim.Objects[target], price);
							price = Math.ceil(price);
							cost += price;
							CM.Sim.Objects[target].amount--;
						}
					}
					CM.Cache.CostDragonUpgrade = `Cost to rebuy: ${CM.Disp.Beautify(cost)}`;
				}
			}
		}
		CM.Cache.lastDragonLevel = Game.dragonLevel;
	}
};

/**
 * Section: Functions related to caching income */

/**
 * This functions caches the income gain of each building and upgrade and stores it in the cache
 * It is called by CM.Main.Loop() and CM.Cache.InitCache()
 */
CM.Cache.CacheIncome = function () {
	// Simulate Building Buys for 1, 10 and 100 amount
	CM.Cache.CacheBuildingIncome(1, 'Objects1');
	CM.Cache.CacheBuildingIncome(10, 'Objects10');
	CM.Cache.CacheBuildingIncome(100, 'Objects100');

	// Simulate Upgrade Buys
	CM.Cache.CacheUpgradeIncome();
};

/**
 * This functions starts the calculation/simulation of the bonus income of buildings
 * It is called by CM.Cache.CacheIncome()
 * @param	{amount}	amount	Amount to be bought
 * @parem	{string}	target	The target Cache object ("Objects1", "Objects10" or "Objects100")
 */
CM.Cache.CacheBuildingIncome = function (amount, target) {
	CM.Cache[target] = [];
	for (const i of Object.keys(Game.Objects)) {
		CM.Cache[target][i] = {};
		CM.Cache[target][i].bonus = CM.Sim.BuyBuildingsBonusIncome(i, amount);
		if (amount !== 1) {
			CM.Cache.DoRemakeBuildPrices = 1;
		}
	}
};

/**
 * This functions starts the calculation/simulation of the bonus income of upgrades
 * It is called by CM.Cache.CacheIncome()
 */
CM.Cache.CacheUpgradeIncome = function () {
	CM.Cache.Upgrades = [];
	for (const i of Object.keys(Game.Upgrades)) {
		const bonusIncome = CM.Sim.BuyUpgradesBonusIncome(i);
		CM.Cache.Upgrades[i] = {};
		if (bonusIncome[0]) CM.Cache.Upgrades[i].bonus = bonusIncome[0];
		if (bonusIncome[1]) CM.Cache.Upgrades[i].bonusMouse = bonusIncome[1];
	}
};

/**
 * Section: Functions related to caching prices */

/**
 * This functions caches the price of each building and stores it in the cache
 * It is called by CM.Main.Loop() and CM.Cache.InitCache()
 */
CM.Cache.CacheBuildingsPrices = function () {
	for (const i of Object.keys(Game.Objects)) {
		CM.Cache.Objects1[i].price = CM.Sim.BuildingGetPrice(Game.Objects[i], Game.Objects[i].basePrice, Game.Objects[i].amount, Game.Objects[i].free, 1);
		CM.Cache.Objects10[i].price = CM.Sim.BuildingGetPrice(Game.Objects[i], Game.Objects[i].basePrice, Game.Objects[i].amount, Game.Objects[i].free, 10);
		CM.Cache.Objects100[i].price = CM.Sim.BuildingGetPrice(Game.Objects[i], Game.Objects[i].basePrice, Game.Objects[i].amount, Game.Objects[i].free, 100);
	}
};

/**
 * Section: Functions related to caching PP */

/**
 * This functions caches the PP of each building and upgrade and stores it in the cache
 * It is called by CM.Cache.LoopCache() and CM.Cache.InitCache()
 */
CM.Cache.CachePP = function () {
	CM.Cache.CacheBuildingsPP();
	CM.Cache.CacheUpgradePP();
};

/**
 * This functions return the colour assosciated with the given pp value
 * It is called by CM.Cache.CacheBuildingsPP(), CM.Cache.CacheBuildingsBulkPP() and CM.Cache.CacheUpgradePP()
 * @params	{object}	obj		The obj of which the pp value should be checked
 * @params	{number}	price	The price of the object
 * @returns {string}	color	The colour assosciated with the pp value
 */
CM.Cache.ColourOfPP = function (me, price) {
	let color = '';
	// Colour based on PP
	if (me.pp <= 0 || me.pp === Infinity) color = CM.Disp.colorGray;
	else if (me.pp < CM.Cache.min) color = CM.Disp.colorBlue;
	else if (me.pp === CM.Cache.min) color = CM.Disp.colorGreen;
	else if (me.pp === CM.Cache.max) color = CM.Disp.colorRed;
	else if (me.pp > CM.Cache.max) color = CM.Disp.colorPurple;
	else if (me.pp > CM.Cache.mid) color = CM.Disp.colorOrange;
	else color = CM.Disp.colorYellow;

	// Colour based on price in terms of CPS
	if (Number(CM.Options.PPSecondsLowerLimit) !== 0) {
		if (price / CM.Disp.GetCPS() < Number(CM.Options.PPSecondsLowerLimit)) color = CM.Disp.colorBlue;
	}
	// Colour based on being able to purchase
	if (CM.Options.PPOnlyConsiderBuyable) {
		if (price - Game.cookies > 0) color = CM.Disp.colorRed;
	}
	return color;
};

/**
 * This functions caches the PP of each building it saves all date in CM.Cache.Objects...
 * It is called by CM.Cache.CachePP()
 */
CM.Cache.CacheBuildingsPP = function () {
	CM.Cache.min = Infinity;
	CM.Cache.max = 1;
	CM.Cache.ArrayOfPPs = [];
	if (typeof CM.Options.PPExcludeTop === 'undefined') CM.Options.PPExcludeTop = 0; // Otherwise breaks during initialization

	// Calculate PP and colors when compared to purchase of optimal building in single-purchase mode
	if (CM.Options.ColorPPBulkMode === 0) {
		for (const i of Object.keys(CM.Cache.Objects1)) {
			if (Game.cookiesPs) {
				CM.Cache.Objects1[i].pp = (Math.max(Game.Objects[i].getPrice() - (Game.cookies + CM.Disp.GetWrinkConfigBank()), 0) / Game.cookiesPs) + (Game.Objects[i].getPrice() / CM.Cache.Objects1[i].bonus);
			} else CM.Cache.Objects1[i].pp = (Game.Objects[i].getPrice() / CM.Cache.Objects1[i].bonus);
			CM.Cache.ArrayOfPPs.push([CM.Cache.Objects1[i].pp, Game.Objects[i].getPrice()]);
		}
		// Set CM.Cache.min to best non-excluded buidliung
		CM.Cache.ArrayOfPPs.sort((a, b) => a[0] - b[0]);
		if (CM.Options.PPOnlyConsiderBuyable) {
			while (CM.Cache.ArrayOfPPs[0][1] > Game.cookies) {
				if (CM.Cache.ArrayOfPPs.length === 1) {
					break;
				}
				CM.Cache.ArrayOfPPs.shift();
			}
		}
		CM.Cache.min = CM.Cache.ArrayOfPPs[CM.Options.PPExcludeTop][0];
		CM.Cache.max = CM.Cache.ArrayOfPPs[CM.Cache.ArrayOfPPs.length - 1][0];
		CM.Cache.mid = ((CM.Cache.max - CM.Cache.min) / 2) + CM.Cache.min;
		for (const i of Object.keys(CM.Cache.Objects1)) {
			CM.Cache.Objects1[i].color = CM.Cache.ColourOfPP(CM.Cache.Objects1[i], Game.Objects[i].getPrice());
			// Colour based on excluding certain top-buildings
			for (let j = 0; j < CM.Options.PPExcludeTop; j++) {
				if (CM.Cache.Objects1[i].pp === CM.Cache.ArrayOfPPs[j][0]) CM.Cache.Objects1[i].color = CM.Disp.colorGray;
			}
		}
		// Calculate PP of bulk-buy modes
		CM.Cache.CacheBuildingsBulkPP('Objects10');
		CM.Cache.CacheBuildingsBulkPP('Objects100');
	} else {
		// Calculate PP and colors when compared to purchase of selected bulk mode
		const target = `Objects${Game.buyBulk}`;
		for (const i of Object.keys(CM.Cache[target])) {
			if (Game.cookiesPs) {
				CM.Cache[target][i].pp = (Math.max(Game.Objects[i].bulkPrice - (Game.cookies + CM.Disp.GetWrinkConfigBank()), 0) / Game.cookiesPs) + (Game.Objects[i].bulkPrice / CM.Cache[target][i].bonus);
			} else CM.Cache[target][i].pp = (Game.Objects[i].bulkPrice / CM.Cache[target][i].bonus);
			CM.Cache.ArrayOfPPs.push([CM.Cache[target][i].pp, Game.Objects[i].bulkPrice]);
		}
		// Set CM.Cache.min to best non-excluded buidliung
		CM.Cache.ArrayOfPPs.sort((a, b) => a[0] - b[0]);
		if (CM.Options.PPOnlyConsiderBuyable) {
			while (CM.Cache.ArrayOfPPs[0][1] > Game.cookies) {
				if (CM.Cache.ArrayOfPPs.length === 1) {
					break;
				}
				CM.Cache.ArrayOfPPs.shift();
			}
		}
		CM.Cache.min = CM.Cache.ArrayOfPPs[CM.Options.PPExcludeTop][0];
		CM.Cache.max = CM.Cache.ArrayOfPPs[CM.Cache.ArrayOfPPs.length - 1][0];
		CM.Cache.mid = ((CM.Cache.max - CM.Cache.min) / 2) + CM.Cache.min;

		for (const i of Object.keys(CM.Cache.Objects1)) {
			CM.Cache[target][i].color = CM.Cache.ColourOfPP(CM.Cache[target][i], Game.Objects[i].bulkPrice);
			// Colour based on excluding certain top-buildings
			for (let j = 0; j < CM.Options.PPExcludeTop; j++) {
				if (CM.Cache[target][i].pp === CM.Cache.ArrayOfPPs[j][0]) CM.Cache[target][i].color = CM.Disp.colorGray;
			}
		}
	}
};

/**
 * This functions caches the buildings of bulk-buy mode when PP is compared against optimal single-purchase building
 * It saves all date in CM.Cache.Objects...
 * It is called by CM.Cache.CacheBuildingsPP()
 */
CM.Cache.CacheBuildingsBulkPP = function (target) {
	for (const i of Object.keys(CM.Cache[target])) {
		if (Game.cookiesPs) {
			CM.Cache[target][i].pp = (Math.max(CM.Cache[target][i].price - (Game.cookies + CM.Disp.GetWrinkConfigBank()), 0) / Game.cookiesPs) + (CM.Cache[target][i].price / CM.Cache[target][i].bonus);
		} else CM.Cache[target][i].pp = (CM.Cache[target][i].price / CM.Cache[target][i].bonus);

		CM.Cache[target][i].color = CM.Cache.ColourOfPP(CM.Cache[target][i], CM.Cache[target][i].price);
	}
};

/**
 * This functions caches the PP of each building it saves all date in CM.Cache.Upgrades
 * It is called by CM.Cache.CachePP()
 */
CM.Cache.CacheUpgradePP = function () {
	for (const i of Object.keys(CM.Cache.Upgrades)) {
		if (Game.cookiesPs) {
			CM.Cache.Upgrades[i].pp = (Math.max(Game.Upgrades[i].getPrice() - (Game.cookies + CM.Disp.GetWrinkConfigBank()), 0) / Game.cookiesPs) + (Game.Upgrades[i].getPrice() / CM.Cache.Upgrades[i].bonus);
		} else CM.Cache.Upgrades[i].pp = (Game.Upgrades[i].getPrice() / CM.Cache.Upgrades[i].bonus);
		if (Number.isNaN(CM.Cache.Upgrades[i].pp)) CM.Cache.Upgrades[i].pp = Infinity;

		CM.Cache.Upgrades[i].color = CM.Cache.ColourOfPP(CM.Cache.Upgrades[i], Game.Upgrades[i].getPrice());
	}
};

/**
 * Section: Cached variables */

/**
 * Used to store the multiplier of the Century Egg
 */
CM.Cache.CentEgg = 0;

/**
 * Used to store if there was a Build Aura (used in CM.Main)
 */
CM.Cache.HadBuildAura = false;

/**
 * Used to store CPS without Golden Cookie Switch
 */
CM.Cache.NoGoldSwitchCookiesPS = 0;
/**
 * Config *
 */

/**
 * Section: Functions related to saving, loading and restoring configs */

/**
 * This function saves the config of CookieMonster without saving any of the other save-data
 * This allows saving in between the autosave intervals
 * It is called by CM.Config.LoadConfig(), CM.Config.RestoreDefault(), CM.Config.ToggleConfig(),
 * CM.ToggleConfigVolume() and changes in options with type "url", "color" or "numscale"
 */
CM.Config.SaveConfig = function () {
	const saveString = b64_to_utf8(unescape(localStorage.getItem('CookieClickerGame')).split('!END!')[0]);
	const CookieMonsterSave = saveString.match(/CookieMonster.*(;|$)/);
	if (CookieMonsterSave !== null) {
		const newSaveString = saveString.replace(CookieMonsterSave[0], `CookieMonster:${CM.save()}`);
		localStorage.setItem('CookieClickerGame', escape(`${utf8_to_b64(newSaveString)}!END!`));
	}
};

/**
 * This function loads the config of CookieMonster saved in localStorage and loads it into CM.Options
 * It is called by CM.Main.DelayInit() and CM.Config.RestoreDefault()
 */
CM.Config.LoadConfig = function (settings) {
	// This removes cookies left from earlier versions of CookieMonster
	if (typeof localStorage.CMConfig !== 'undefined') {
		delete localStorage.CMConfig;
	}
	if (settings !== undefined) {
		CM.Options = settings;

		// Check values
		let mod = false;
		for (const i in CM.Data.ConfigDefault) {
			if (typeof CM.Options[i] === 'undefined') {
				mod = true;
				CM.Options[i] = CM.Data.ConfigDefault[i];
			} else if (i !== 'Header' && i !== 'Colors') {
				if (i.indexOf('SoundURL') === -1) {
					if (!(CM.Options[i] > -1 && CM.Options[i] < CM.Data.Config[i].label.length)) {
						mod = true;
						CM.Options[i] = CM.Data.ConfigDefault[i];
					}
				} else if (typeof CM.Options[i] !== 'string') { // Sound URLs
					mod = true;
					CM.Options[i] = CM.Data.ConfigDefault[i];
				}
			} else if (i === 'Header') {
				for (const j in CM.Data.ConfigDefault.Header) {
					if (typeof CM.Options[i][j] === 'undefined' || !(CM.Options[i][j] > -1 && CM.Options[i][j] < 2)) {
						mod = true;
						CM.Options[i][j] = CM.Data.ConfigDefault[i][j];
					}
				}
			} else { // Colors
				for (const j in CM.Data.ConfigDefault.Colors) {
					if (typeof CM.Options[i][j] === 'undefined' || typeof CM.Options[i][j] !== 'string') {
						mod = true;
						CM.Options[i][j] = CM.Data.ConfigDefault[i][j];
					}
				}
			}
		}
		if (mod) CM.Config.SaveConfig();
		CM.Main.Loop(); // Do loop once
		for (const i in CM.Data.ConfigDefault) {
			if (i !== 'Header' && typeof CM.Data.Config[i].func !== 'undefined') {
				CM.Data.Config[i].func();
			}
		}
	} else { // Default values
		CM.Config.RestoreDefault();
	}
};

/**
 * This function reloads and resaves the default config as stored in CM.Data.ConfigDefault
 * It is called by resDefBut.onclick loaded in the options page or by CM.Config.LoadConfig if no localStorage is found
 */
CM.Config.RestoreDefault = function () {
	CM.Config.LoadConfig(CM.Data.ConfigDefault);
	CM.Config.SaveConfig();
	Game.UpdateMenu();
};

/**
 * Section: Functions related to toggling or changing configs */

/**
 * This function toggles options by incrementing them with 1 and handling changes
 * It is called by the onclick event of options of the "bool" type
 * @param 	{string}	config	The name of the option
 */
CM.Config.ToggleConfig = function (config) {
	CM.Options[config]++;

	if (CM.Options[config] === CM.Data.Config[config].label.length) {
		CM.Options[config] = 0;
		if (CM.Data.Config[config].toggle) l(CM.Config.ConfigPrefix + config).className = 'option off';
	} else l(CM.Config.ConfigPrefix + config).className = 'option';

	if (typeof CM.Data.Config[config].func !== 'undefined') {
		CM.Data.Config[config].func();
	}

	l(CM.Config.ConfigPrefix + config).innerHTML = CM.Data.Config[config].label[CM.Options[config]];
	CM.Config.SaveConfig();
};

/**
 * This function sets the value of the specified volume-option and updates the display in the options menu
 * It is called by the oninput and onchange event of "vol" type options
 * @param 	{string}	config	The name of the option
 */
CM.Config.ToggleConfigVolume = function (config) {
	if (l(`slider${config}`) !== null) {
		l(`slider${config}right`).innerHTML = `${l(`slider${config}`).value}%`;
		CM.Options[config] = Math.round(l(`slider${config}`).value);
	}
	CM.Config.SaveConfig();
};

/**
 * This function toggles header options by incrementing them with 1 and handling changes
 * It is called by the onclick event of the +/- next to headers
 * @param 	{string}	config	The name of the header
 */
CM.Config.ToggleHeader = function (config) {
	CM.Options.Header[config]++;
	if (CM.Options.Header[config] > 1) CM.Options.Header[config] = 0;
	CM.Config.SaveConfig();
};

/**
 * Section: Functions related to notifications */

/**
 * This function checks if the user has given permissions for notifications
 * It is called by a change in any of the notification options
 * Note that most browsers will stop asking if the user has ignored the prompt around 6 times
 * @param 	{number}	ToggleOnOff		A number indicating whether the option has been turned off (0) or on (1)
 */
CM.Config.CheckNotificationPermissions = function (ToggleOnOff) {
	if (ToggleOnOff === 1)	{
		// Check if browser support Promise version of Notification Permissions
		const checkNotificationPromise = function () {
			try {
				Notification.requestPermission().then();
			} catch (e) {
				return false;
			}
			return true;
		};

		// Check if the browser supports notifications and which type
		if (!('Notification' in window)) {
			console.log('This browser does not support notifications.');
		} else if (checkNotificationPromise()) {
			Notification.requestPermission().then();
		} else {
			Notification.requestPermission();
		}
	}
};

/**
 * Section: Variables used in Config functions */

/**
 * Used to name certain DOM elements and refer to them
 */
CM.Config.ConfigPrefix = 'CMConfig';
/**
 * Data *
 */

/**
 * Section: Data used in the stats page to show not yet purchased updates. See CM.Disp.CreateStatsMissDisp() */

CM.Data.Fortunes = [
	'Fortune #001',
	'Fortune #002',
	'Fortune #003',
	'Fortune #004',
	'Fortune #005',
	'Fortune #006',
	'Fortune #007',
	'Fortune #008',
	'Fortune #009',
	'Fortune #010',
	'Fortune #011',
	'Fortune #012',
	'Fortune #013',
	'Fortune #014',
	'Fortune #015',
	'Fortune #016',
	'Fortune #017',
	'Fortune #018',
	'Fortune #100',
	'Fortune #101',
	'Fortune #102',
	'Fortune #103',
	'Fortune #104',
];
CM.Data.HalloCookies = ['Skull cookies', 'Ghost cookies', 'Bat cookies', 'Slime cookies', 'Pumpkin cookies', 'Eyeball cookies', 'Spider cookies'];
CM.Data.ChristCookies = ['Christmas tree biscuits', 'Snowflake biscuits', 'Snowman biscuits', 'Holly biscuits', 'Candy cane biscuits', 'Bell biscuits', 'Present biscuits'];
CM.Data.ValCookies = ['Pure heart biscuits', 'Ardent heart biscuits', 'Sour heart biscuits', 'Weeping heart biscuits', 'Golden heart biscuits', 'Eternal heart biscuits', 'Prism heart biscuits'];
CM.Data.PlantDrops = ['Elderwort biscuits', 'Bakeberry cookies', 'Duketater cookies', 'Green yeast digestives', 'Wheat slims', 'Fern tea', 'Ichor syrup'];

/**
 * Section: All possible effects plants and other items can have with an explanation */

CM.Data.Effects = {
	buildingCost: 'Building prices',
	click: 'Cookies per click',
	cps: 'Total CPS',
	cursorCps: 'Cursor CPS',
	goldenCookieDur: 'Golden cookie duration',
	goldenCookieEffDur: 'Golden cookie effect duration',
	goldenCookieFreq: 'Golden cookie frequency',
	goldenCookieGain: 'Golden cookie gains',
	grandmaCps: 'Grandma CPS',
	itemDrops: 'Random item drop chance',
	milk: 'Effect from milk',
	reindeerDur: 'Reindeer duration',
	reindeerFreq: 'Reindeer frequency',
	reindeerGain: 'Reindeer gains',
	upgradeCost: 'Upgrade prices',
	wrathCookieDur: 'Wrath cookie duration',
	wrathCookieEffDur: 'Wrath cookie effect duration',
	wrathCookieFreq: 'Wrath cookie frequency',
	wrathCookieGain: 'Wrath cookie gains',
	wrinklerEat: 'Wrinkler ',
	wrinklerSpawn: 'Wrinkler spawn frequency',
};

/**
 * Section: Data for the various scales used by CookieMonster */

CM.Data.metric = ['', '', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
CM.Data.shortScale = ['', '', 'M', 'B', 'Tr', 'Quadr', 'Quint', 'Sext', 'Sept', 'Oct', 'Non', 'Dec', 'Undec', 'Duodec', 'Tredec', 'Quattuordec', 'Quindec', 'Sexdec', 'Septendec', 'Octodec', 'Novemdec', 'Vigint', 'Unvigint', 'Duovigint', 'Trevigint', 'Quattuorvigint'];
CM.Data.shortScaleAbbreviated = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'De',
	'UDe', 'DDe', 'TDe', 'QaDe', 'QiDe', 'SxDe', 'SpDe', 'ODe', 'NDe', 'Vi',
	'UVi', 'DVi', 'TVi', 'QaVi', 'QiVi', 'SxVi', 'SpVi', 'OVi', 'NVi', 'Tr',
	'UTr', 'DTr', 'TTr', 'QaTr', 'QiTr', 'SxTr', 'SpTr', 'OTr', 'NTr', 'Qaa',
	'UQa', 'DQa', 'TQa', 'QaQa', 'QiQa', 'SxQa', 'SpQa', 'OQa', 'NQa', 'Qia',
	'UQi', 'DQi', 'TQi', 'QaQi', 'QiQi', 'SxQi', 'SpQi', 'OQi', 'NQi', 'Sxa',
	'USx', 'DSx', 'TSx', 'QaSx', 'QiSx', 'SxSx', 'SpSx', 'OSx', 'NSx', 'Spa',
	'USp', 'DSp', 'TSp', 'QaSp', 'QiSp', 'SxSp', 'SpSp', 'OSp', 'NSp', 'Oco',
	'UOc', 'DOc', 'TOc', 'QaOc', 'QiOc', 'SxOc', 'SpOc', 'OOc', 'NOc', 'Noa',
	'UNo', 'DNo', 'TNo', 'QaNo', 'QiNo', 'SxNo', 'SpNo', 'ONo', 'NNo', 'Ct',
	'UCt'];

/**
 * Section: Two array's containing all Config groups and their to-be displayed title */

CM.Data.ConfigGroups = {
	BarsColors: 'Bars/Colors',
	Calculation: 'Calculation',
	Notification: 'Notification',
	Tooltip: 'Tooltips and additional insights',
	Statistics: 'Statistics',
	Notation: 'Notation',
	Miscellaneous: 'Miscellaneous',
};

CM.Data.ConfigGroupsNotification = {
	NotificationGeneral: 'General Notifications',
	NotificationGC: 'Golden Cookie',
	NotificationFC: 'Fortune Cookie',
	NotificationSea: 'Season Special',
	NotificationGard: 'Garden Tick',
	NotificationMagi: 'Full Magic Bar',
	NotificationWrink: 'Wrinkler',
	NotificationWrinkMax: 'Maximum Wrinklers',
};

/**
 * Section: An array (CM.Data.Config) containing all Config options and an array of default settings */

/**
 * This includes all options of CookieMonster and relevant data
 * Each individual option-array in the has the following items
 * @item {string}			type	The type of option (bool(ean), vol(ume), url or color)
 * @item {string}			group	The options-group the option belongs to
 * @item {[string, ...]}	label	A list of the various configurations of the option
 * @item {string}			desc 	Description to be used in options menu
 * @item {boolean}			toggle	Whether it should be displayed as a grey/white toggle in the options menu
 * @item {function}			func	A function to be called when the option is toggled
 */
// Barscolors
CM.Data.Config.BotBar = {
	type: 'bool', group: 'BarsColors', label: ['Bottom Bar OFF', 'Bottom Bar ON'], desc: 'Building Information', toggle: true, func: function () { CM.Disp.ToggleBotBar(); },
};
CM.Data.Config.TimerBar = {
	type: 'bool', group: 'BarsColors', label: ['Timer Bar OFF', 'Timer Bar ON'], desc: 'Timers of Golden Cookie, Season Popup, Frenzy (Normal, Clot, Elder), Click Frenzy', toggle: true, func: function () { CM.Disp.ToggleTimerBar(); },
};
CM.Data.Config.TimerBarPos = {
	type: 'bool', group: 'BarsColors', label: ['Timer Bar Position (Top Left)', 'Timer Bar Position (Bottom)'], desc: 'Placement of the Timer Bar', toggle: false, func: function () { CM.Disp.ToggleTimerBarPos(); },
};
CM.Data.Config.TimerBarOverlay = {
	type: 'bool', group: 'BarsColors', label: ['Timer Bar Overlay OFF', 'Timer Bar Overlay Only Seconds', 'Timer Bar Overlay Full'], desc: 'Overlay on timers displaying seconds and/or percentage left', toggle: true,
};
CM.Data.Config.SortBuildings = {
	type: 'bool', group: 'BarsColors', label: ['Sort Buildings: Default', 'Sort Buildings: PP'], desc: 'Sort the display of buildings in either default order or by PP', toggle: false,	func: function () { CM.Disp.UpdateBuildings(); },
};
CM.Data.Config.SortUpgrades = {
	type: 'bool', group: 'BarsColors', label: ['Sort Upgrades: Default', 'Sort Upgrades: PP'], desc: 'Sort the display of upgrades in either default order or by PP', toggle: false, func: function () { CM.Disp.UpdateUpgrades(); },
};
CM.Data.Config.BuildColor = {
	type: 'bool', group: 'BarsColors', label: ['Building Colors OFF', 'Building Colors ON'], desc: 'Color code buildings', toggle: true, func: function () { CM.Disp.UpdateBuildings(); },
};
CM.Data.Config.BulkBuildColor = {
	type: 'bool', group: 'BarsColors', label: ['Bulk Building Colors (Single Building Color)', 'Bulk Building Colors (Calculated Bulk Color)'], desc: 'Color code bulk buildings based on single buildings color or calculated bulk value color', toggle: false, func: function () { CM.Disp.UpdateBuildings(); },
};
CM.Data.Config.UpBarColor = {
	type: 'bool', group: 'BarsColors', label: ['Upgrade Colors/Bar OFF', 'Upgrade Colors with Bar ON', 'Upgrade Colors without Bar ON'], desc: 'Color code upgrades and optionally add a counter bar', toggle: false, func: function () { CM.Disp.ToggleUpgradeBarAndColor(); },
};
CM.Data.Config.Colors = {
	type: 'color',
	group: 'BarsColors',
	desc: {
		Blue: 'Color Blue.  Used to show better than best PP building, for Click Frenzy bar, and for various labels',
		Green: 'Color Green.  Used to show best PP building, for Blood Frenzy bar, and for various labels',
		Yellow: 'Color Yellow.  Used to show between best and worst PP buildings closer to best, for Frenzy bar, and for various labels',
		Orange: 'Color Orange.  Used to show between best and worst PP buildings closer to worst, for Next Reindeer bar, and for various labels',
		Red: 'Color Red.  Used to show worst PP building, for Clot bar, and for various labels',
		Purple: 'Color Purple.  Used to show worse than worst PP building, for Next Cookie bar, and for various labels',
		Gray: 'Color Gray.  Used to show negative or infinity PP, and for Next Cookie/Next Reindeer bar',
		Pink: 'Color Pink.  Used for Dragonflight bar',
		Brown: 'Color Brown.  Used for Dragon Harvest bar',
	},
	func: function () { CM.Disp.UpdateColors(); },
};
CM.Data.Config.UpgradeBarFixedPos = {
	type: 'bool', group: 'BarsColors', label: ['Upgrade Bar Fixed Position OFF', 'Upgrade Bar Fixed Position ON'], desc: 'Lock the upgrade bar at top of the screen to prevent it from moving ofscreen when scrolling', toggle: true, func: function () { CM.Disp.ToggleUpgradeBarFixedPos(); },
};

// Calculation
CM.Data.Config.CalcWrink = {
	type: 'bool', group: 'Calculation', label: ['Calculate with Wrinklers OFF', 'Calculate with Wrinklers ON', 'Calculate with Single Fattest Wrinkler ON'], desc: 'Calculate times and average Cookies Per Second with (only the single non-shiny fattest) Wrinklers', toggle: true,
};
CM.Data.Config.CPSMode = {
	type: 'bool', group: 'Calculation', label: ['Current Cookies Per Second', 'Average Cookies Per Second'], desc: 'Calculate times using current Cookies Per Second or average Cookies Per Second', toggle: false,
};
CM.Data.Config.AvgCPSHist = {
	type: 'bool', group: 'Calculation', label: ['Average CPS for past 10s', 'Average CPS for past 15s', 'Average CPS for past 30s', 'Average CPS for past 1m', 'Average CPS for past 5m', 'Average CPS for past 10m', 'Average CPS for past 15m', 'Average CPS for past 30m'], desc: 'How much time average Cookies Per Second should consider', toggle: false,
};
CM.Data.Config.AvgClicksHist = {
	type: 'bool', group: 'Calculation', label: ['Average Cookie Clicks for past 1s', 'Average Cookie Clicks for past 5s', 'Average Cookie Clicks for past 10s', 'Average Cookie Clicks for past 15s', 'Average Cookie Clicks for past 30s'], desc: 'How much time average Cookie Clicks should consider', toggle: false,
};
CM.Data.Config.ColorPPBulkMode = {
	type: 'bool', group: 'Calculation', label: ['Color of PP (Compared to Single)', 'Color of PP (Compared to Bulk)'], desc: 'Color PP-values based on comparison with single purchase or with selected bulk-buy mode', toggle: false, func: function () { CM.Cache.CachePP(); },
};
CM.Data.Config.PPExcludeTop = {
	type: 'bool', group: 'Calculation', label: ["Don't Ignore Any", 'Ignore 1st Best', 'Ignore 1st and 2nd Best', 'Ignore 1st, 2nd and 3rd Best'], desc: 'Makes CookieMonster ignore the 1st, 2nd or 3rd best buildings in labeling and colouring PP values', toggle: true,
};
CM.Data.Config.PPSecondsLowerLimit = {
	type: 'numscale', group: 'Calculation', label: 'Lower limit for PP (in seconds): ', desc: 'If a building or upgrade costs less than the specified seconds of CPS it will also be considered optimal and label it as such ("PP is less than xx seconds of CPS"); setting to 0 ignores this option', min: 0, max: Infinity,
};
CM.Data.Config.PPOnlyConsiderBuyable = {
	type: 'bool', group: 'Calculation', label: ["Don't Ignore Non-Buyable", 'Ignore Non-Buyable'], desc: "Makes CookieMonster label buildings and upgrades you can't buy right now red, useful in those situations where you just want to spend your full bank 'most optimally'", toggle: true,
};
CM.Data.Config.ToolWarnBon = {
	type: 'bool', group: 'Calculation', label: ['Calculate Tooltip Warning With Bonus CPS OFF', 'Calculate Tooltip Warning With Bonus CPS ON'], desc: 'Calculate the warning with or without the bonus CPS you get from buying', toggle: true,
};

// Notification
CM.Data.Config.Title = {
	type: 'bool', group: 'NotificationGeneral', label: ['Title OFF', 'Title ON', 'Title Pinned Tab Highlight'], desc: 'Update title with Golden Cookie/Season Popup timers; pinned tab highlight only changes the title when a Golden Cookie/Season Popup spawns; "!" means that Golden Cookie/Reindeer can spawn', toggle: true,
};
CM.Data.Config.GeneralSound = {
	type: 'bool', group: 'NotificationGeneral', label: ['Consider Game Volume Setting OFF', 'Consider Game Volume Setting ON'], desc: 'Turning this toggle to "off" makes Cookie Monster no longer consider the volume setting of the base game, allowing mod notifications to play with base game volume turned down', toggle: true,
};
CM.Data.Config.GCNotification = {
	type: 'bool', group: 'NotificationGC', label: ['Notification OFF', 'Notification ON'], desc: 'Create a notification when Golden Cookie spawns', toggle: true, func: function () { CM.Config.CheckNotificationPermissions(CM.Options.GCNotification); },
};
CM.Data.Config.GCFlash = {
	type: 'bool', group: 'NotificationGC', label: ['Flash OFF', 'Flash ON'], desc: 'Flash screen on Golden Cookie', toggle: true,
};
CM.Data.Config.GCSound = {
	type: 'bool', group: 'NotificationGC', label: ['Sound OFF', 'Sound ON'], desc: 'Play a sound on Golden Cookie', toggle: true,
};
CM.Data.Config.GCVolume = {
	type: 'vol', group: 'NotificationGC', label: [], desc: 'Volume',
};
for (let i = 0; i < 101; i++) {
	CM.Data.Config.GCVolume.label[i] = `${i}%`;
}
CM.Data.Config.GCSoundURL = {
	type: 'url', group: 'NotificationGC', label: 'Sound URL:', desc: 'URL of the sound to be played when a Golden Cookie spawns',
};
CM.Data.Config.FortuneNotification = {
	type: 'bool', group: 'NotificationFC', label: ['Notification OFF', 'Notification ON'], desc: 'Create a notification when Fortune Cookie is on the Ticker', toggle: true, func: function () { CM.Config.CheckNotificationPermissions(CM.Options.FortuneNotification); },
};
CM.Data.Config.FortuneFlash = {
	type: 'bool', group: 'NotificationFC', label: ['Flash OFF', 'Flash ON'], desc: 'Flash screen on Fortune Cookie', toggle: true,
};
CM.Data.Config.FortuneSound = {
	type: 'bool', group: 'NotificationFC', label: ['Sound OFF', 'Sound ON'], desc: 'Play a sound on Fortune Cookie', toggle: true,
};
CM.Data.Config.FortuneVolume = {
	type: 'vol', group: 'NotificationFC', label: [], desc: 'Volume',
};
for (let i = 0; i < 101; i++) {
	CM.Data.Config.FortuneVolume.label[i] = `${i}%`;
}
CM.Data.Config.FortuneSoundURL = {
	type: 'url', group: 'NotificationFC', label: 'Sound URL:', desc: 'URL of the sound to be played when the Ticker has a Fortune Cookie',
};
CM.Data.Config.SeaNotification = {
	type: 'bool', group: 'NotificationSea', label: ['Notification OFF', 'Notification ON'], desc: 'Create a notification on Season Popup', toggle: true, func: function () { CM.Config.CheckNotificationPermissions(CM.Options.SeaNotification); },
};
CM.Data.Config.SeaFlash = {
	type: 'bool', group: 'NotificationSea', label: ['Flash OFF', 'Flash ON'], desc: 'Flash screen on Season Popup', toggle: true,
};
CM.Data.Config.SeaSound = {
	type: 'bool', group: 'NotificationSea', label: ['Sound OFF', 'Sound ON'], desc: 'Play a sound on Season Popup', toggle: true,
};
CM.Data.Config.SeaVolume = {
	type: 'vol', group: 'NotificationSea', label: [], desc: 'Volume',
};
for (let i = 0; i < 101; i++) {
	CM.Data.Config.SeaVolume.label[i] = `${i}%`;
}
CM.Data.Config.SeaSoundURL = {
	type: 'url', group: 'NotificationSea', label: 'Sound URL:', desc: 'URL of the sound to be played when a Season Special spawns',
};
CM.Data.Config.GardFlash = {
	type: 'bool', group: 'NotificationGard', label: ['Garden Tick Flash OFF', 'Flash ON'], desc: 'Flash screen on Garden Tick', toggle: true,
};
CM.Data.Config.GardSound = {
	type: 'bool', group: 'NotificationGard', label: ['Sound OFF', 'Sound ON'], desc: 'Play a sound on Garden Tick', toggle: true,
};
CM.Data.Config.GardVolume = {
	type: 'vol', group: 'NotificationGard', label: [], desc: 'Volume',
};
for (let i = 0; i < 101; i++) {
	CM.Data.Config.GardVolume.label[i] = `${i}%`;
}
CM.Data.Config.GardSoundURL = {
	type: 'url', group: 'NotificationGard', label: 'Garden Tick Sound URL:', desc: 'URL of the sound to be played when the garden ticks',
};
CM.Data.Config.MagicNotification = {
	type: 'bool', group: 'NotificationMagi', label: ['Notification OFF', 'Notification ON'], desc: 'Create a notification when magic reaches maximum', toggle: true, func: function () { CM.Config.CheckNotificationPermissions(CM.Options.MagicNotification); },
};
CM.Data.Config.MagicFlash = {
	type: 'bool', group: 'NotificationMagi', label: ['Flash OFF', 'Flash ON'], desc: 'Flash screen when magic reaches maximum', toggle: true,
};
CM.Data.Config.MagicSound = {
	type: 'bool', group: 'NotificationMagi', label: ['Sound OFF', 'Sound ON'], desc: 'Play a sound when magic reaches maximum', toggle: true,
};
CM.Data.Config.MagicVolume = {
	type: 'vol', group: 'NotificationMagi', label: [], desc: 'Volume',
};
for (let i = 0; i < 101; i++) {
	CM.Data.Config.MagicVolume.label[i] = `${i}%`;
}
CM.Data.Config.MagicSoundURL = {
	type: 'url', group: 'NotificationMagi', label: 'Sound URL:', desc: 'URL of the sound to be played when magic reaches maxium',
};
CM.Data.Config.WrinklerNotification = {
	type: 'bool', group: 'NotificationWrink', label: ['Notification OFF', 'Notification ON'], desc: 'Create a notification when a Wrinkler appears', toggle: true, func: function () { CM.Config.CheckNotificationPermissions(CM.Options.WrinklerNotification); },
};
CM.Data.Config.WrinklerFlash = {
	type: 'bool', group: 'NotificationWrink', label: ['Flash OFF', 'Flash ON'], desc: 'Flash screen when a Wrinkler appears', toggle: true,
};
CM.Data.Config.WrinklerSound = {
	type: 'bool', group: 'NotificationWrink', label: ['Sound OFF', 'Sound ON'], desc: 'Play a sound when a Wrinkler appears', toggle: true,
};
CM.Data.Config.WrinklerVolume = {
	type: 'vol', group: 'NotificationWrink', label: [], desc: 'Volume',
};
for (let i = 0; i < 101; i++) {
	CM.Data.Config.WrinklerVolume.label[i] = `${i}%`;
}
CM.Data.Config.WrinklerSoundURL = {
	type: 'url', group: 'NotificationWrink', label: 'Sound URL:', desc: 'URL of the sound to be played when a Wrinkler appears',
};
CM.Data.Config.WrinklerMaxNotification = {
	type: 'bool', group: 'NotificationWrinkMax', label: ['Notification OFF', 'Notification ON'], desc: 'Create a notification when the maximum amount of Wrinklers has appeared', toggle: true, func: function () { CM.Config.CheckNotificationPermissions(CM.Options.WrinklerMaxNotification); },
};
CM.Data.Config.WrinklerMaxFlash = {
	type: 'bool', group: 'NotificationWrinkMax', label: ['Flash OFF', 'Flash ON'], desc: 'Flash screen when the maximum amount of Wrinklers has appeared', toggle: true,
};
CM.Data.Config.WrinklerMaxSound = {
	type: 'bool', group: 'NotificationWrinkMax', label: ['Sound OFF', 'Sound ON'], desc: 'Play a sound when the maximum amount of Wrinklers has appeared', toggle: true,
};
CM.Data.Config.WrinklerMaxVolume = {
	type: 'vol', group: 'NotificationWrinkMax', label: [], desc: 'Volume',
};
for (let i = 0; i < 101; i++) {
	CM.Data.Config.WrinklerMaxVolume.label[i] = `${i}%`;
}
CM.Data.Config.WrinklerMaxSoundURL = {
	type: 'url', group: 'NotificationWrinkMax', label: 'Sound URL:', desc: 'URL of the sound to be played when the maximum amount of Wrinklers has appeared',
};

// Tooltip
CM.Data.Config.TooltipBuildUpgrade = {
	type: 'bool', group: 'Tooltip', label: ['Building/Upgrade Tooltip Information OFF', 'Building/Upgrade  Tooltip Information ON'], desc: 'Extra information in Building/Upgrade tooltips', toggle: true,
};
CM.Data.Config.TooltipAmor = {
	type: 'bool', group: 'Tooltip', label: ['Buildings Tooltip Amortization Information OFF', 'Buildings Tooltip Amortization Information ON'], desc: 'Add amortization information to buildings tooltip', toggle: true,
};
CM.Data.Config.ToolWarnLucky = {
	type: 'bool', group: 'Tooltip', label: ['Tooltip Lucky Warning OFF', 'Tooltip Lucky Warning ON'], desc: 'A warning when buying if it will put the bank under the amount needed for max "Lucky!" rewards', toggle: true,
};
CM.Data.Config.ToolWarnLuckyFrenzy = {
	type: 'bool', group: 'Tooltip', label: ['Tooltip Lucky Frenzy Warning OFF', 'Tooltip Lucky Frenzy Warning ON'], desc: 'A warning when buying if it will put the bank under the amount needed for max "Lucky!" (Frenzy) rewards', toggle: true,
};
CM.Data.Config.ToolWarnConjure = {
	type: 'bool', group: 'Tooltip', label: ['Tooltip Conjure Warning OFF', 'Tooltip Conjure Warning ON'], desc: 'A warning when buying if it will put the bank under the amount needed for max "Conjure Baked Goods" rewards', toggle: true,
};
CM.Data.Config.ToolWarnConjureFrenzy = {
	type: 'bool', group: 'Tooltip', label: ['Tooltip Conjure Frenzy Warning OFF', 'Tooltip Conjure Frenzy Warning ON'], desc: 'A warning when buying if it will put the bank under the amount needed for max "Conjure Baked Goods" rewards with Frenzy active', toggle: true,
};
CM.Data.Config.ToolWarnEdifice = {
	type: 'bool', group: 'Tooltip', label: ['Tooltip Edifice Warning OFF', 'Tooltip Edifice Warning ON'], desc: 'A warning when buying if it will put the bank under the amount needed for "Spontaneous Edifice" to possibly give you your most expensive building', toggle: true,
};
CM.Data.Config.ToolWarnUser = {
	type: 'numscale', group: 'Tooltip', label: 'Tooltip Warning At x times CPS: ', desc: 'Use this to show a customized warning if buying it will put the bank under the amount equal to value times cps; setting to 0 disables the function altogether', min: 0, max: Infinity,
};
CM.Data.Config.ToolWarnPos = {
	type: 'bool', group: 'Tooltip', label: ['Tooltip Warning Position (Left)', 'Tooltip Warning Position (Bottom)'], desc: 'Placement of the warning boxes', toggle: false, func: function () { CM.Disp.ToggleToolWarnPos(); },
};
CM.Data.Config.TooltipGrim = {
	type: 'bool', group: 'Tooltip', label: ['Grimoire Tooltip Information OFF', 'Grimoire Tooltip Information ON'], desc: 'Extra information in tooltip for grimoire', toggle: true,
};
CM.Data.Config.TooltipWrink = {
	type: 'bool', group: 'Tooltip', label: ['Wrinkler Tooltip OFF', 'Wrinkler Tooltip ON'], desc: 'Shows the amount of cookies a wrinkler will give when popping it', toggle: true,
};
CM.Data.Config.TooltipLump = {
	type: 'bool', group: 'Tooltip', label: ['Sugar Lump Tooltip OFF', 'Sugar Lump Tooltip ON'], desc: 'Shows the current Sugar Lump type in Sugar lump tooltip.', toggle: true,
};
CM.Data.Config.TooltipPlots = {
	type: 'bool', group: 'Tooltip', label: ['Garden Plots Tooltip OFF', 'Garden Plots Tooltip ON'], desc: 'Shows a tooltip for plants that have a cookie reward.', toggle: true,
};
CM.Data.Config.DragonAuraInfo = {
	type: 'bool', group: 'Tooltip', label: ['Extra Dragon Aura Info OFF', 'Extra Dragon Aura Info ON'], desc: 'Shows information about changes in CPS and costs in the dragon aura interface.', toggle: true,
};
CM.Data.Config.TooltipAscendButton = {
	type: 'bool', group: 'Tooltip', label: ['Show Extra Info Ascend Tooltip OFF', 'Show Extra Info Ascend Tooltip ON'], desc: 'Shows additional info in the ascend tooltip', toggle: true,
};

// Statistics
CM.Data.Config.Stats = {
	type: 'bool', group: 'Statistics', label: ['Statistics OFF', 'Statistics ON'], desc: 'Extra Cookie Monster statistics!', toggle: true,
};
CM.Data.Config.MissingUpgrades = {
	type: 'bool', group: 'Statistics', label: ['Missing Upgrades OFF', 'Missing Upgrades ON'], desc: 'Shows Missing upgrades in Stats Menu. This feature can be laggy for users with a low amount of unlocked achievements.', toggle: true,
};
CM.Data.Config.UpStats = {
	type: 'bool', group: 'Statistics', label: ['Statistics Update Rate (Default)', 'Statistics Update Rate (1s)'], desc: 'Default Game rate is once every 5 seconds', toggle: false,
};
CM.Data.Config.TimeFormat = {
	type: 'bool', group: 'Statistics', label: ['Time XXd, XXh, XXm, XXs', 'Time XX:XX:XX:XX:XX'], desc: 'Change the time format', toggle: false,
};
CM.Data.Config.DetailedTime = {
	type: 'bool', group: 'Statistics', label: ['Detailed Time OFF', 'Detailed Time ON'], desc: 'Change how time is displayed in certain statistics and tooltips', toggle: true, func: function () { CM.Disp.ToggleDetailedTime(); },
};
CM.Data.Config.GrimoireBar = {
	type: 'bool', group: 'Statistics', label: ['Grimoire Magic Meter Timer OFF', 'Grimoire Magic Meter Timer ON'], desc: 'A timer on how long before the Grimoire magic meter is full', toggle: true,
};
CM.Data.Config.HeavenlyChipsTarget = {
	type: 'numscale', group: 'Statistics', label: 'Heavenly Chips Target: ', desc: 'Use this to set a Heavenly Chips target that will be counted towards in the "prestige" statsistics sections', min: 1, max: Infinity,
};
CM.Data.Config.ShowMissedGC = {
	type: 'bool', group: 'Statistics', label: ['Missed GC OFF', 'Missed GC ON'], desc: 'Show a stat in the statistics screen that counts how many Golden Cookies you have missed', toggle: true,
};

// Notation
CM.Data.Config.Scale = {
	type: 'bool', group: 'Notation', label: ['Game\'s Setting Scale', 'Metric', 'Short Scale', 'Short Scale (Abbreviated)', 'Scientific Notation', 'Engineering Notation'], desc: 'Change how long numbers are handled', toggle: false, func: function () { CM.Disp.RefreshScale(); },
};
CM.Data.Config.ScaleDecimals = {
	type: 'bool', group: 'Notation', label: ['1 decimals', '2 decimals', '3 decimals'], desc: 'Set the number of decimals used when applicable', toggle: false, func: function () { CM.Disp.RefreshScale(); },
};
CM.Data.Config.ScaleSeparator = {
	type: 'bool', group: 'Notation', label: ['. for decimals (Standard)', '. for thousands'], desc: 'Set the separator used for decimals and thousands', toggle: false, func: function () { CM.Disp.RefreshScale(); },
};
CM.Data.Config.ScaleCutoff = {
	type: 'numscale', group: 'Notation', label: 'Notation Cut-off Point: ', desc: 'The number from which CookieMonster will start formatting numbers based on chosen scale. Standard is 999,999. Setting this above 999,999,999 might break certain notations', min: 1, max: 999999999,
};

// Miscellaneous
CM.Data.Config.GCTimer = {
	type: 'bool', group: 'Miscellaneous', label: ['Golden Cookie Timer OFF', 'Golden Cookie Timer ON'], desc: 'A timer on the Golden Cookie when it has been spawned', toggle: true, func: function () { CM.Disp.ToggleGCTimer(); },
};
CM.Data.Config.Favicon = {
	type: 'bool', group: 'Miscellaneous', label: ['Favicon OFF', 'Favicon ON'], desc: 'Update favicon with Golden/Wrath Cookie', toggle: true, func: function () { CM.Disp.UpdateFavicon(); },
};
CM.Data.Config.WrinklerButtons = {
	type: 'bool', group: 'Miscellaneous', label: ['Extra Buttons OFF', 'Extra Buttons ON'], desc: 'Show buttons for popping wrinklers at bottom of cookie section', toggle: true, func: function () { CM.Disp.UpdateWrinklerButtons(); },
};
CM.Data.Config.BulkBuyBlock = {
	type: 'bool', group: 'Miscellaneous', label: ['Block Bulk Buying OFF', 'Block Bulk Buying ON'], desc: "Block clicking bulk buying when you can't buy all. This prevents buying 7 of a building when you are in buy-10 or buy-100 mode.", toggle: true,
};

/**
 * This array describes all default settings
 * It is used by CM.LoadConfig() and CM.Config.RestoreDefault()
 */
CM.Data.ConfigDefault = {
	BotBar: 1,
	TimerBar: 1,
	TimerBarPos: 0,
	TimerBarOverlay: 2,
	BuildColor: 1,
	BulkBuildColor: 0,
	UpBarColor: 1,
	UpgradeBarFixedPos: 1,
	CalcWrink: 0,
	CPSMode: 1,
	AvgCPSHist: 3,
	AvgClicksHist: 0,
	ColorPPBulkMode: 1,
	PPExcludeTop: 0,
	PPSecondsLowerLimit: 0,
	PPOnlyConsiderBuyable: 0,
	ToolWarnBon: 0,
	Title: 1,
	GeneralSound: 1,
	GCNotification: 0,
	GCFlash: 1,
	GCSound: 1,
	GCVolume: 100,
	GCSoundURL: 'https://freesound.org/data/previews/66/66717_931655-lq.mp3',
	FortuneNotification: 0,
	FortuneFlash: 1,
	FortuneSound: 1,
	FortuneVolume: 100,
	FortuneSoundURL: 'https://freesound.org/data/previews/174/174027_3242494-lq.mp3',
	SeaNotification: 0,
	SeaFlash: 1,
	SeaSound: 1,
	SeaVolume: 100,
	SeaSoundURL: 'https://www.freesound.org/data/previews/121/121099_2193266-lq.mp3',
	GardFlash: 1,
	GardSound: 1,
	GardVolume: 100,
	GardSoundURL: 'https://freesound.org/data/previews/103/103046_861714-lq.mp3',
	MagicNotification: 0,
	MagicFlash: 1,
	MagicSound: 1,
	MagicVolume: 100,
	MagicSoundURL: 'https://freesound.org/data/previews/221/221683_1015240-lq.mp3',
	WrinklerNotification: 0,
	WrinklerFlash: 1,
	WrinklerSound: 1,
	WrinklerVolume: 100,
	WrinklerSoundURL: 'https://freesound.org/data/previews/124/124186_8043-lq.mp3',
	WrinklerMaxNotification: 0,
	WrinklerMaxFlash: 1,
	WrinklerMaxSound: 1,
	WrinklerMaxVolume: 100,
	WrinklerMaxSoundURL: 'https://freesound.org/data/previews/152/152743_15663-lq.mp3',
	TooltipBuildUpgrade: 1,
	TooltipAmor: 0,
	ToolWarnLucky: 1,
	ToolWarnLuckyFrenzy: 1,
	ToolWarnConjure: 1,
	ToolWarnConjureFrenzy: 1,
	ToolWarnEdifice: 1,
	ToolWarnUser: 0,
	ToolWarnPos: 1,
	TooltipGrim: 1,
	TooltipWrink: 1,
	TooltipLump: 1,
	TooltipPlots: 1,
	DragonAuraInfo: 1,
	TooltipAscendButton: 1,
	Stats: 1,
	MissingUpgrades: 1,
	UpStats: 1,
	TimeFormat: 0,
	DetailedTime: 1,
	GrimoireBar: 1,
	HeavenlyChipsTarget: 1,
	ShowMissedGC: 1,
	Scale: 2,
	ScaleDecimals: 2,
	ScaleSeparator: 0,
	ScaleCutoff: 999999,
	Colors: {
		Blue: '#4bb8f0', Green: '#00ff00', Yellow: '#ffff00', Orange: '#ff7f00', Red: '#ff0000', Purple: '#ff00ff', Gray: '#b3b3b3', Pink: '#ff1493', Brown: '#8b4513',
	},
	SortBuildings: 0,
	SortUpgrades: 0,
	GCTimer: 1,
	Favicon: 1,
	WrinklerButtons: 1,
	BulkBuyBlock: 0,
	Header: {
		BarsColors: 1, Calculation: 1, Notification: 1, NotificationGeneral: 1, NotificationGC: 1, NotificationFC: 1, NotificationSea: 1, NotificationGard: 1, NotificationMagi: 1, NotificationWrink: 1, NotificationWrinkMax: 1, Tooltip: 1, Statistics: 1, Notation: 1, Miscellaneous: 1, Lucky: 1, Chain: 1, Spells: 1, Garden: 1, Prestige: 1, Wrink: 1, Sea: 1, Misc: 1, InfoTab: 1,
	},
};

/**
 * These variables are used to describe Cookie Monster in the info tab
 * It is used by CM.Disp.AddMenuInfo()
 */
CM.Data.ModDescription = `<div class="listing">
<a href="https://github.com/iasinme/CookieMonster" target="blank">Cookie Monster</a>
offers a wide range of tools and statistics to enhance your game experience.
It is not a cheat interface – although it does offer helpers for golden cookies and such, everything can be toggled off at will to only leave how much information you want.</br>
Progess on new updates and all previous release notes can be found on the GitHub page linked above!</br>
Please also report any bugs you may find over there!</br>
</div>
`;
CM.Data.LatestReleaseNotes = `<div class="listing">
<b>The latest update (v 2.031.4) has introduced the following features:</b></br>
- Added a changelog to the info tab and notification indicating a new version</br>
- Warnings in tooltips are now based on the income after buying the upgrade</br>
- A new warning and stat for Conjure Baked Goods in combination with Frenzy has been added</br>
- User can now set a custom tooltip warning ("x times cps") in the settings</br>
- Garden plots with plants that give cookies on harvest now display a tooltip with current and maximum reward</br>
- The Harvest All button in the Garden now has a tooltip displaying the current reward </br>
- The Ascend button can now display additional info (this can be turned off in the settings) </br>
- The statistics page now displays the Heavenly Chips per second</br>
- The statistics page now displays the CPS needed for the next level in Chain Cookies</br>
- The statistics page now displays the cookies needed for optimal rewards for garden plants</br>
- You can now set a Heavenly Chips target in the settings which will be counted down to in the statistics page</br>
- The color picker in the settings has been updated to its latest version</br>
- The overlay of seconds/percentage of timers is now toggle able and more readable</br>
- You can now toggle to disable bulk-buying from buying less than the selected amount (i.e., buying 7 of a building by pressing the buy 10 when you don't have enough for 10)</br>
- CookieMonster now uses the Modding API provided by the base game</br>
- There is a new option that allows the decoupling of the base game volume setting and the volumes of sounds created by the mod</br>
- The tab title now displays a "!" if a Golden Cookie or Reindeer can spawn</br>
- PP calculation can now be set to: 1) Exclude the 1st, 2nd or 3rd most optimal building (if you never want to buy that it), 2) Always consider optimal buildings that cost below "xx seconds of CPS" (toggleable in the settings), 3) Ignore any building or upgrade that is not purchasable at the moment</br>
</br>
<b>This update fixes the following bugs:</b></br>
- Minigames with enhanced tooltips will now also show these if the minigames were not loaded when CookieMonster was loaded</br>
- Sound, Flashes and Notifications will no longer play when the mod is initializing</br>
- The color picker should now update its display consistently</br>
- Fixed some typo's</br>
- Fixed a game breaking bug when the player had not purchased any upgrades</br>
- Fixed a number of console errors thrown by CM</br>
- Fixed the integration with mods that provide additional content, they should now no longer break CookieMonster</br>
- The Timer bar will now disappear correctly when the Golden Switch has been activated</br>
- Fixed errors in the calculation of the Chain Cookies and Wrinkler stats</br>
- Fixed buy warnings showing incorrectly</br>
</div>
`;
/**
 * Disp *
 */

/**
 * Please make sure to annotate your code correctly using JSDoc.
 * Only put functions related to graphics and displays in this file.
 * All calculations and data should preferrably be put in other files. */

/**
 * Section: Auxilirary functions used by other functions */

/**
 * This function returns the total amount stored in the Wrinkler Bank
 * as calculated by  CM.Cache.CacheWrinklers() if CM.Options.CalcWrink is set
 * @returns	{number}	0 or the amount of cookies stored (CM.Cache.WrinklersTotal)
 */
CM.Disp.GetWrinkConfigBank = function () {
	if (CM.Options.CalcWrink === 1) {
		return CM.Cache.WrinklersTotal;
	} else if (CM.Options.CalcWrink === 2) {
		return CM.Cache.WrinklersFattest[0];
	} else {
		return 0;
	}
};

/**
 * This function pops all normal wrinklers
 * It is called by a click of the 'pop all' button created by CM.Disp.AddMenuStats()
 */
CM.Disp.PopAllNormalWrinklers = function () {
	for (const i of Object.keys(Game.wrinklers)) {
		if (Game.wrinklers[i].sucked > 0 && Game.wrinklers[i].type === 0) {
			Game.wrinklers[i].hp = 0;
		}
	}
};

/**
 * This function returns the cps as either current or average CPS depending on CM.Options.CPSMode
 * @returns	{number}	The average or current cps
 */
CM.Disp.GetCPS = function () {
	if (CM.Options.CPSMode) {
		return CM.Cache.AvgCPS;
	} else if (CM.Options.CalcWrink === 0) {
		return (Game.cookiesPs * (1 - Game.cpsSucked));
	} else if (CM.Options.CalcWrink === 1) {
		return Game.cookiesPs * (CM.Cache.CurrWrinklerCPSMult + (1 - (CM.Cache.CurrWrinklerCount * 0.05)));
	} else if (CM.Options.CalcWrink === 2 && Game.wrinklers[CM.Cache.WrinklersFattest[1]].type === 1) {
		return Game.cookiesPs * ((CM.Cache.CurrWrinklerCPSMult * 3 / CM.Cache.CurrWrinklerCount) + (1 - (CM.Cache.CurrWrinklerCount * 0.05)));
	} else {
		return Game.cookiesPs * ((CM.Cache.CurrWrinklerCPSMult / CM.Cache.CurrWrinklerCount) + (1 - (CM.Cache.CurrWrinklerCount * 0.05)));
	}
};

/**
 * This function calculates the time it takes to reach a certain magic level
 * It is called by CM.Disp.UpdateTooltipGrimoire()
 * @param	{number}	currentMagic		The current magic level
 * @param	{number}	maxMagic			The user's max magic level
 * @param	{number}	targetMagic			The target magic level
 * @returns	{number}	count / Game.fps	The time it takes to reach targetMagic
 */
CM.Disp.CalculateGrimoireRefillTime = function (currentMagic, maxMagic, targetMagic) {
	let count = 0;
	while (currentMagic < targetMagic) {
		currentMagic += Math.max(0.002, (currentMagic / Math.max(maxMagic, 100)) ** 0.5) * 0.002;
		count++;
	}
	return count / Game.fps;
};

/**
 * This function returns Name and Color as object for sugar lump type that is given as input param.
 * It is called by CM.Disp.UpdateTooltipSugarLump()
 * @param 	{string} 				type 			Sugar Lump Type.
 * @returns {{string}, {string}}	text, color		An array containing the text and display-color of the sugar lump
 */
CM.Disp.GetLumpColor = function (type) {
	if (type === 0) {
		return { text: 'Normal', color: CM.Disp.colorGray };
	} else if (type === 1) {
		return { text: 'Bifurcated', color: CM.Disp.colorGreen };
	} else if (type === 2) {
		return { text: 'Golden', color: CM.Disp.colorYellow };
	} else if (type === 3) {
		return { text: 'Meaty', color: CM.Disp.colorOrange };
	} else if (type === 4) {
		return { text: 'Caramelized', color: CM.Disp.colorPurple };
	} else {
		return { text: 'Unknown Sugar Lump', color: CM.Disp.colorRed };
	}
};

/**
 * Section: General functions to format or beautify strings */

/**
 * This function returns time as a string depending on TimeFormat setting
 * @param  	{number} 	time		Time to be formatted
 * @param  	{number}	longFormat 	1 or 0
 * @returns	{string}				Formatted time
 */
CM.Disp.FormatTime = function (time, longFormat) {
	if (time === Infinity) return time;
	time = Math.ceil(time);
	const y = Math.floor(time / 31557600);
	const d = Math.floor(time % 31557600 / 86400);
	const h = Math.floor(time % 86400 / 3600);
	const m = Math.floor(time % 3600 / 60);
	const s = Math.floor(time % 60);
	let str = '';
	if (CM.Options.TimeFormat) {
		if (time > 3155760000) return 'XX:XX:XX:XX:XX';
		str += `${(y < 10 ? '0' : '') + y}:`;
		str += `${(d < 10 ? '0' : '') + d}:`;
		str += `${(h < 10 ? '0' : '') + h}:`;
		str += `${(m < 10 ? '0' : '') + m}:`;
		str += (s < 10 ? '0' : '') + s;
	} else {
		if (time > 777600000) return longFormat ? 'Over 9000 days!' : '>9000d';
		str += (y > 0 ? `${y + (longFormat ? (y === 1 ? ' year' : ' years') : 'y')}, ` : '');
		str += (d > 0 ? `${d + (longFormat ? (d === 1 ? ' day' : ' days') : 'd')}, ` : '');
		if (str.length > 0 || h > 0) str += `${h + (longFormat ? (h === 1 ? ' hour' : ' hours') : 'h')}, `;
		if (str.length > 0 || m > 0) str += `${m + (longFormat ? (m === 1 ? ' minute' : ' minutes') : 'm')}, `;
		str += s + (longFormat ? (s === 1 ? ' second' : ' seconds') : 's');
	}
	return str;
};

/**
 * This function returns the color to be used for time-strings
 * @param	{number}			time			Time to be coloured
 * @returns {{string, string}}	{text, color}	Both the formatted time and color as strings in an array
 */
CM.Disp.GetTimeColor = function (time) {
	let color;
	let text;
	if (time < 0) {
		if (CM.Options.TimeFormat) text = '00:00:00:00:00';
		else text = 'Done!';
		color = CM.Disp.colorGreen;
	} else {
		text = CM.Disp.FormatTime(time);
		if (time > 300) color = CM.Disp.colorRed;
		else if (time > 60) color = CM.Disp.colorOrange;
		else color = CM.Disp.colorYellow;
	}
	return { text, color };
};

/**
 * This function returns formats number based on the Scale setting
 * @param	{number}	num		Number to be beautified
 * @param 	{any}		floats 	Used in some scenario's by CM.Backup.Beautify (Game's original function)
 * @param	{number}	forced	Used to force (type 3) in certains cases
 * @returns	{string}			Formatted number
 */
CM.Disp.Beautify = function (num, floats, forced) {
	const decimals = CM.Options.ScaleDecimals + 1;
	if (CM.Options.Scale === 0) {
		return CM.Backup.Beautify(num, floats);
	} else if (Number.isFinite(num)) {
		let answer = '';
		if (num === 0) {
			return num.toString();
		} else if (num > 0.001 && num < CM.Options.ScaleCutoff) {
			answer = num.toFixed(2);
			if (CM.Options.ScaleSeparator) answer = answer.toLocaleString('nl');
			for (let i = 0; i < 3; i++) {
				if (answer[answer.length - 1] === '0' || answer[answer.length - 1] === '.') answer = answer.slice(0, -1);
			}
			return answer;
		} else if (CM.Options.Scale === 4 && !forced || forced === 4) { // Scientific notation, 123456789 => 1.235E+8
			answer = num.toExponential(decimals).toString().replace('e', 'E');
		} else {
			const exponential = num.toExponential().toString();
			const AmountOfTenPowerThree = Math.floor(exponential.slice(exponential.indexOf('e') + 1) / 3);
			answer = (num / Number(`1e${AmountOfTenPowerThree * 3}`)).toFixed(decimals);
			// answer is now "xxx.xx" (e.g., 123456789 would be 123.46)
			if (CM.Options.Scale === 1 && !forced || forced === 1) { // Metric scale, 123456789 => 123.457 M
				if (num >= 0.01 && num < Number(`1e${CM.Data.metric.length * 3}`)) {
					answer += ` ${CM.Data.metric[AmountOfTenPowerThree]}`;
				} else answer = CM.Disp.Beautify(num, 0, 4); // If number is too large or little, revert to scientific notation
			} else if (CM.Options.Scale === 2 && !forced || forced === 2) { // Short scale, 123456789 => 123.457 M
				if (num >= 0.01 && num < Number(`1e${CM.Data.shortScale.length * 3}`)) {
					answer += ` ${CM.Data.shortScale[AmountOfTenPowerThree]}`;
				} else answer = CM.Disp.Beautify(num, 0, 4); // If number is too large or little, revert to scientific notation
			} else if (CM.Options.Scale === 3 && !forced || forced === 3) { // Short scale, 123456789 => 123.457 M
				if (num >= 0.01 && num < Number(`1e${CM.Data.shortScaleAbbreviated.length * 3}`)) {
					answer += ` ${CM.Data.shortScaleAbbreviated[AmountOfTenPowerThree]}`;
				} else answer = CM.Disp.Beautify(num, 0, 4); // If number is too large or little, revert to scientific notation
			} else if (CM.Options.Scale === 5 && !forced || forced === 5) { // Engineering notation, 123456789 => 123.457E+6
				answer += `E${AmountOfTenPowerThree * 3}`;
			}
		}
		if (answer === '') {
			console.log(`Could not beautify number with CM.Disp.Beautify: ${num}`);
			answer = CM.Backup.Beautify(num, floats);
		}
		if (CM.Options.ScaleSeparator) answer = answer.replace('.', ',');
		return answer;
	} else if (num === Infinity) {
		return 'Infinity';
	} else if (typeof num === 'undefined') {
		return 0;
	} else {
		console.log(`Could not beautify number with CM.Disp.Beautify: ${num}`);
		return CM.Backup.Beautify(num, floats);
	}
};

/**
 * Section: General functions related to display, drawing and initialization of the page */

/**
 * This function disables and shows the bars created by CookieMonster when the game is "ascending"
 * It is called by CM.Disp.Draw()
 */
CM.Disp.UpdateAscendState = function () {
	if (Game.OnAscend) {
		l('game').style.bottom = '0px';
		if (CM.Options.BotBar === 1) CM.Disp.BotBar.style.display = 'none';
		if (CM.Options.TimerBar === 1) CM.Disp.TimerBar.style.display = 'none';
	} else {
		CM.Disp.ToggleBotBar();
		CM.Disp.ToggleTimerBar();
	}
	CM.Disp.UpdateBackground();
};

/**
 * This function creates a CSS style that stores certain standard CSS classes used by CookieMonster
 * It is called by CM.Main.DelayInit()
 */
CM.Disp.CreateCssArea = function () {
	CM.Disp.Css = document.createElement('style');
	CM.Disp.Css.type = 'text/css';

	document.head.appendChild(CM.Disp.Css);
};

/**
 * This function updates the style of the building and upgrade sections to make these sortable
 * It is called by CM.Main.DelayInit()
 */
CM.Disp.UpdateBuildingUpgradeStyle = function () {
	l('products').style.display = 'grid';
	l('storeBulk').style.gridRow = '1/1';

	l('upgrades').style.display = 'flex';
	l('upgrades').style['flex-wrap'] = 'wrap';
};

/**
 * This function sets the size of the background of the full game and the left column
 * depending on whether certain abrs are activated
 * It is called by CM.Disp.UpdateAscendState() and CM.Disp.UpdateBotTimerBarPosition()
 */
CM.Disp.UpdateBackground = function () {
	Game.Background.canvas.width = Game.Background.canvas.parentNode.offsetWidth;
	Game.Background.canvas.height = Game.Background.canvas.parentNode.offsetHeight;
	Game.LeftBackground.canvas.width = Game.LeftBackground.canvas.parentNode.offsetWidth;
	Game.LeftBackground.canvas.height = Game.LeftBackground.canvas.parentNode.offsetHeight;
};

/**
 * This function handles all custom drawing for the Game.Draw() function.
 * It is hooked on 'draw' by CM.RegisterHooks()
 */
CM.Disp.Draw = function () {
	// Draw autosave timer in stats menu, this must be done here to make it count down correctly
	if (
		(Game.prefs.autosave && Game.drawT % 10 === 0) // with autosave ON and every 10 ticks
		&& (Game.onMenu === 'stats' && CM.Options.Stats) // while being on the stats menu only
	) {
		const timer = document.getElementById('CMStatsAutosaveTimer');
		if (timer) {
			timer.innerText = Game.sayTime(Game.fps * 60 - (Game.T % (Game.fps * 60)), 4);
		}
	}

	// Update colors
	CM.Disp.UpdateBuildings();
	CM.Disp.UpdateUpgrades();

	// Redraw timers
	CM.Disp.UpdateTimerBar();

	// Update Bottom Bar
	CM.Disp.UpdateBotBar();

	// Update Tooltip
	CM.Disp.UpdateTooltip();

	// Update Wrinkler Tooltip
	CM.Disp.CheckWrinklerTooltip();
	CM.Disp.UpdateWrinklerTooltip();

	// Change menu refresh interval
	CM.Disp.RefreshMenu();
};

/**
 * Section: Functions related to the Bottom Bar */

/**
 * This function toggle the bottom bar
 * It is called by CM.Disp.UpdateAscendState() and a change in CM.Options.BotBar
 */
CM.Disp.ToggleBotBar = function () {
	if (CM.Options.BotBar === 1) {
		CM.Disp.BotBar.style.display = '';
		if (!CM.Footer.isInitzializing) {
			CM.Disp.UpdateBotBar();
		}
	} else {
		CM.Disp.BotBar.style.display = 'none';
	}
	CM.Disp.UpdateBotTimerBarPosition();
};

/**
 * This function creates the bottom bar and appends it to l('wrapper')
 * It is called by CM.Main.DelayInit and a change in CM.Options.BotBar
 */
CM.Disp.CreateBotBar = function () {
	CM.Disp.BotBar = document.createElement('div');
	CM.Disp.BotBar.id = 'CMBotBar';
	CM.Disp.BotBar.style.height = '69px';
	CM.Disp.BotBar.style.width = '100%';
	CM.Disp.BotBar.style.position = 'absolute';
	CM.Disp.BotBar.style.display = 'none';
	CM.Disp.BotBar.style.backgroundColor = '#262224';
	CM.Disp.BotBar.style.backgroundImage = 'linear-gradient(to bottom, #4d4548, #000000)';
	CM.Disp.BotBar.style.borderTop = '1px solid black';
	CM.Disp.BotBar.style.overflow = 'auto';
	CM.Disp.BotBar.style.textShadow = '-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black';

	const table = CM.Disp.BotBar.appendChild(document.createElement('table'));
	table.style.width = '100%';
	table.style.textAlign = 'center';
	table.style.whiteSpace = 'nowrap';
	const tbody = table.appendChild(document.createElement('tbody'));

	const firstCol = function (text, color) {
		const td = document.createElement('td');
		td.style.textAlign = 'right';
		td.className = CM.Disp.colorTextPre + color;
		td.textContent = text;
		return td;
	};
	const type = tbody.appendChild(document.createElement('tr'));
	type.style.fontWeight = 'bold';
	type.appendChild(firstCol(`CM ${CM.VersionMajor}.${CM.VersionMinor}`, CM.Disp.colorYellow));
	const bonus = tbody.appendChild(document.createElement('tr'));
	bonus.appendChild(firstCol('Bonus Income', CM.Disp.colorBlue));
	const pp = tbody.appendChild(document.createElement('tr'));
	pp.appendChild(firstCol('Payback Period', CM.Disp.colorBlue));
	const time = tbody.appendChild(document.createElement('tr'));
	time.appendChild(firstCol('Time Left', CM.Disp.colorBlue));

	for (const i of Object.keys(Game.Objects)) {
		CM.Disp.CreateBotBarBuildingColumn(i);
	}

	l('wrapper').appendChild(CM.Disp.BotBar);
};

/**
 * This function updates the bonus-, pp-, and time-rows in the the bottom bar
 * It is called by CM.Disp.Draw()
 */
CM.Disp.UpdateBotBar = function () {
	if (CM.Options.BotBar === 1 && CM.Cache.Objects1) {
		let count = 0;
		for (const i of Object.keys(CM.Cache.Objects1)) {
			const target = `Objects${Game.buyBulk}`;
			count++;
			CM.Disp.BotBar.firstChild.firstChild.childNodes[0].childNodes[count].childNodes[1].textContent = Game.Objects[i].amount;
			CM.Disp.BotBar.firstChild.firstChild.childNodes[1].childNodes[count].textContent = Beautify(CM.Cache[target][i].bonus, 2);
			CM.Disp.BotBar.firstChild.firstChild.childNodes[2].childNodes[count].className = CM.Disp.colorTextPre + CM.Cache[target][i].color;
			CM.Disp.BotBar.firstChild.firstChild.childNodes[2].childNodes[count].textContent = Beautify(CM.Cache[target][i].pp, 2);
			const timeColor = CM.Disp.GetTimeColor((Game.Objects[i].bulkPrice - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS());
			CM.Disp.BotBar.firstChild.firstChild.childNodes[3].childNodes[count].className = CM.Disp.colorTextPre + timeColor.color;
			if (timeColor.text === 'Done!' && Game.cookies < Game.Objects[i].bulkPrice) {
				CM.Disp.BotBar.firstChild.firstChild.childNodes[3].childNodes[count].textContent = `${timeColor.text} (with Wrink)`;
			} else CM.Disp.BotBar.firstChild.firstChild.childNodes[3].childNodes[count].textContent = timeColor.text;
		}
	}
};

/**
 * This function extends the bottom bar (created by CM.Disp.CreateBotBar) with a column for the given building.
 * This function is called by CM.Disp.CreateBotBar on initialization of Cookie Monster,
 * and also in CM.Sim.CopyData if a new building (added by another mod) is discovered.
 * @param	{string}	buildingName	Objectname to be added (e.g., "Cursor")
 */
CM.Disp.CreateBotBarBuildingColumn = function (buildingName) {
	if (!CM.Disp.BotBar) {
		CM.Disp.CreateBotBar();
		return; // CreateBotBar will call this function again
	}

	const type = CM.Disp.BotBar.firstChild.firstChild.childNodes[0];
	const bonus = CM.Disp.BotBar.firstChild.firstChild.childNodes[1];
	const pp = CM.Disp.BotBar.firstChild.firstChild.childNodes[2];
	const time = CM.Disp.BotBar.firstChild.firstChild.childNodes[3];

	const i = buildingName;
	const header = type.appendChild(document.createElement('td'));
	header.appendChild(document.createTextNode(`${i.indexOf(' ') !== -1 ? i.substring(0, i.indexOf(' ')) : i} (`));

	const span = header.appendChild(document.createElement('span'));
	span.className = CM.Disp.colorTextPre + CM.Disp.colorBlue;

	header.appendChild(document.createTextNode(')'));
	bonus.appendChild(document.createElement('td'));
	pp.appendChild(document.createElement('td'));
	time.appendChild(document.createElement('td'));
};

/**
 * Section: Functions related to the Timer Bar

/**
 * This function creates the TimerBar and appends it to l('wrapper')
 * It is called by CM.Main.DelayInit()
 */
CM.Disp.CreateTimerBar = function () {
	CM.Disp.TimerBar = document.createElement('div');
	CM.Disp.TimerBar.id = 'CMTimerBar';
	CM.Disp.TimerBar.style.position = 'absolute';
	CM.Disp.TimerBar.style.display = 'none';
	CM.Disp.TimerBar.style.height = '0px';
	CM.Disp.TimerBar.style.fontSize = '10px';
	CM.Disp.TimerBar.style.fontWeight = 'bold';
	CM.Disp.TimerBar.style.backgroundColor = 'black';

	CM.Disp.TimerBars = {};
	CM.Disp.BuffTimerBars = {};

	// Create standard Golden Cookie bar
	CM.Disp.TimerBars.CMTimerBarGC = CM.Disp.TimerBarCreateBar('CMTimerBarGC',
		'Next Cookie',
		[{ id: 'CMTimerBarGCMinBar', color: CM.Disp.colorGray }, { id: 'CMTimerBarGCBar', color: CM.Disp.colorPurple }]);
	CM.Disp.TimerBar.appendChild(CM.Disp.TimerBars.CMTimerBarGC);

	// Create standard Reindeer bar
	CM.Disp.TimerBars.CMTimerBarRen = CM.Disp.TimerBarCreateBar('CMTimerBarRen',
		'Next Reindeer',
		[{ id: 'CMTimerBarRenMinBar', color: CM.Disp.colorGray }, { id: 'CMTimerBarRenBar', color: CM.Disp.colorOrange }]);
	CM.Disp.TimerBar.appendChild(CM.Disp.TimerBars.CMTimerBarRen);

	l('wrapper').appendChild(CM.Disp.TimerBar);
};

/**
 * This function creates an indivudual timer for the timer bar
 * It is called by CM.Main.DelayInit()
 * @param	{string}					id					An id to identify the timer
 * @param	{string}					name				The title of the timer
 * @param	[{{string}, {string}}, ...]	bars ([id, color])	The id and colours of individual parts of the timer
 */
CM.Disp.TimerBarCreateBar = function (id, name, bars) {
	const timerBar = document.createElement('div');
	timerBar.id = 'CMTimerBar';
	timerBar.style.height = '12px';
	timerBar.style.margin = '0px 10px';
	timerBar.style.position = 'relative';

	const div = document.createElement('div');
	div.style.width = '100%';
	div.style.height = '10px';
	div.style.margin = 'auto';
	div.style.position = 'absolute';
	div.style.left = '0px';
	div.style.top = '0px';
	div.style.right = '0px';
	div.style.bottom = '0px';

	const type = document.createElement('span');
	type.style.display = 'inline-block';
	type.style.textAlign = 'right';
	type.style.fontSize = '10px';
	type.style.width = '108px';
	type.style.marginRight = '5px';
	type.style.verticalAlign = 'text-top';
	type.textContent = name;
	div.appendChild(type);

	for (let i = 0; i < bars.length; i++) {
		const colorBar = document.createElement('span');
		colorBar.id = bars[i].id;
		colorBar.style.display = 'inline-block';
		colorBar.style.height = '10px';
		colorBar.style.verticalAlign = 'text-top';
		colorBar.style.textAlign = 'center';
		if (bars.length - 1 === i) {
			colorBar.style.borderTopRightRadius = '10px';
			colorBar.style.borderBottomRightRadius = '10px';
		}
		if (typeof bars[i].color !== 'undefined') {
			colorBar.className = CM.Disp.colorBackPre + bars[i].color;
		}
		div.appendChild(colorBar);
	}

	const timer = document.createElement('span');
	timer.id = `${id}Time`;
	timer.style.marginLeft = '5px';
	timer.style.verticalAlign = 'text-top';
	div.appendChild(timer);

	timerBar.appendChild(div);

	return timerBar;
};

/**
 * This function updates indivudual timers in the timer bar
 * It is called by CM.Disp.Draw()
 */
CM.Disp.UpdateTimerBar = function () {
	if (CM.Options.TimerBar === 1) {
		// label width: 113, timer width: 30, div margin: 20
		const maxWidthTwoBar = CM.Disp.TimerBar.offsetWidth - 163;
		// label width: 113, div margin: 20, calculate timer width at runtime
		const maxWidthOneBar = CM.Disp.TimerBar.offsetWidth - 133;
		let numberOfTimers = 0;

		// Regulates visibility of Golden Cookie timer
		if (Game.shimmerTypes.golden.spawned === 0 && !Game.Has('Golden switch [off]')) {
			CM.Disp.TimerBars.CMTimerBarGC.style.display = '';
			l('CMTimerBarGCMinBar').style.width = `${Math.round(Math.max(0, Game.shimmerTypes.golden.minTime - Game.shimmerTypes.golden.time) * maxWidthTwoBar / Game.shimmerTypes.golden.maxTime)}px`;
			if (CM.Options.TimerBarOverlay >= 1) l('CMTimerBarGCMinBar').textContent = Math.ceil((Game.shimmerTypes.golden.minTime - Game.shimmerTypes.golden.time) / Game.fps);
			else l('CMTimerBarGCMinBar').textContent = '';
			if (Game.shimmerTypes.golden.minTime === Game.shimmerTypes.golden.maxTime) {
				l('CMTimerBarGCMinBar').style.borderTopRightRadius = '10px';
				l('CMTimerBarGCMinBar').style.borderBottomRightRadius = '10px';
			} else {
				l('CMTimerBarGCMinBar').style.borderTopRightRadius = '';
				l('CMTimerBarGCMinBar').style.borderBottomRightRadius = '';
			}
			l('CMTimerBarGCBar').style.width = `${Math.round(Math.min(Game.shimmerTypes.golden.maxTime - Game.shimmerTypes.golden.minTime, Game.shimmerTypes.golden.maxTime - Game.shimmerTypes.golden.time) * maxWidthTwoBar / Game.shimmerTypes.golden.maxTime)}px`;
			if (CM.Options.TimerBarOverlay >= 1) l('CMTimerBarGCBar').textContent = Math.ceil(Math.min(Game.shimmerTypes.golden.maxTime - Game.shimmerTypes.golden.minTime, Game.shimmerTypes.golden.maxTime - Game.shimmerTypes.golden.time) / Game.fps);
			else l('CMTimerBarGCBar').textContent = '';
			l('CMTimerBarGCTime').textContent = Math.ceil((Game.shimmerTypes.golden.maxTime - Game.shimmerTypes.golden.time) / Game.fps);
			numberOfTimers++;
		} else CM.Disp.TimerBars.CMTimerBarGC.style.display = 'none';

		// Regulates visibility of Reindeer timer
		if (Game.season === 'christmas' && Game.shimmerTypes.reindeer.spawned === 0) {
			CM.Disp.TimerBars.CMTimerBarRen.style.display = '';
			l('CMTimerBarRenMinBar').style.width = `${Math.round(Math.max(0, Game.shimmerTypes.reindeer.minTime - Game.shimmerTypes.reindeer.time) * maxWidthTwoBar / Game.shimmerTypes.reindeer.maxTime)}px`;
			if (CM.Options.TimerBarOverlay >= 1) l('CMTimerBarRenMinBar').textContent = Math.ceil((Game.shimmerTypes.reindeer.minTime - Game.shimmerTypes.reindeer.time) / Game.fps);
			else l('CMTimerBarRenMinBar').textContent = '';
			l('CMTimerBarRenBar').style.width = `${Math.round(Math.min(Game.shimmerTypes.reindeer.maxTime - Game.shimmerTypes.reindeer.minTime, Game.shimmerTypes.reindeer.maxTime - Game.shimmerTypes.reindeer.time) * maxWidthTwoBar / Game.shimmerTypes.reindeer.maxTime)}px`;
			if (CM.Options.TimerBarOverlay >= 1) l('CMTimerBarRenBar').textContent = Math.ceil(Math.min(Game.shimmerTypes.reindeer.maxTime - Game.shimmerTypes.reindeer.minTime, Game.shimmerTypes.reindeer.maxTime - Game.shimmerTypes.reindeer.time) / Game.fps);
			else l('CMTimerBarRenBar').textContent = '';
			l('CMTimerBarRenTime').textContent = Math.ceil((Game.shimmerTypes.reindeer.maxTime - Game.shimmerTypes.reindeer.time) / Game.fps);
			numberOfTimers++;
		} else {
			CM.Disp.TimerBars.CMTimerBarRen.style.display = 'none';
		}

		// On every frame all buff-timers are deleted and re-created
		for (const i of Object.keys(CM.Disp.BuffTimerBars)) {
			CM.Disp.BuffTimerBars[i].remove();
		}
		CM.Disp.BuffTimerBars = {};
		for (const i of Object.keys(Game.buffs)) {
			if (Game.buffs[i]) {
				const timer = CM.Disp.TimerBarCreateBar(Game.buffs[i].name, Game.buffs[i].name, [{ id: `${Game.buffs[i].name}Bar` }]);
				timer.style.display = '';
				let classColor = '';
				// Gives specific timers specific colors
				if (typeof CM.Disp.buffColors[Game.buffs[i].name] !== 'undefined') {
					classColor = CM.Disp.buffColors[Game.buffs[i].name];
				} else classColor = CM.Disp.colorPurple;
				timer.lastChild.children[1].className = CM.Disp.colorBackPre + classColor;
				timer.lastChild.children[1].style.color = 'black';
				if (CM.Options.TimerBarOverlay === 2) timer.lastChild.children[1].textContent = `${Math.round(100 * (Game.buffs[i].time / Game.buffs[i].maxTime))}%`;
				else timer.lastChild.children[1].textContent = '';
				timer.lastChild.children[1].style.width = `${Math.round(Game.buffs[i].time * (maxWidthOneBar - Math.ceil(Game.buffs[i].time / Game.fps).toString().length * 8) / Game.buffs[i].maxTime)}px`;
				timer.lastChild.children[2].textContent = Math.ceil(Game.buffs[i].time / Game.fps);
				numberOfTimers++;
				CM.Disp.BuffTimerBars[Game.buffs[i].name] = timer;
			}
		}
		for (const i of Object.keys(CM.Disp.BuffTimerBars)) {
			CM.Disp.TimerBar.appendChild(CM.Disp.BuffTimerBars[i]);
		}

		if (numberOfTimers !== 0) {
			CM.Disp.TimerBar.style.height = `${numberOfTimers * 12 + 2}px`;
		}
		if (CM.Disp.LastNumberOfTimers !== numberOfTimers) {
			CM.Disp.LastNumberOfTimers = numberOfTimers;
			CM.Disp.UpdateBotTimerBarPosition();
		}
	}
};

/**
 * This function changes the visibility of the timer bar
 * It is called by CM.Disp.UpdateAscendState() or a change in CM.Options.TimerBar
 */
CM.Disp.ToggleTimerBar = function () {
	if (CM.Options.TimerBar === 1) CM.Disp.TimerBar.style.display = '';
	else CM.Disp.TimerBar.style.display = 'none';
	CM.Disp.UpdateBotTimerBarPosition();
};

/**
 * This function changes the position of the timer bar
 * It is called by a change in CM.Options.TimerBarPos
 */
CM.Disp.ToggleTimerBarPos = function () {
	if (CM.Options.TimerBarPos === 0) {
		CM.Disp.TimerBar.style.width = '30%';
		CM.Disp.TimerBar.style.bottom = '';
		l('game').insertBefore(CM.Disp.TimerBar, l('sectionLeft'));
	} else {
		CM.Disp.TimerBar.style.width = '100%';
		CM.Disp.TimerBar.style.bottom = '0px';
		l('wrapper').appendChild(CM.Disp.TimerBar);
	}
	CM.Disp.UpdateBotTimerBarPosition();
};

/**
 * Section: Functions related to the both the bottom and timer bar

/**
 * This function changes the position of both the bottom and timer bar
 * It is called by CM.Disp.ToggleTimerBar(), CM.Disp.ToggleTimerBarPos() and CM.Disp.ToggleBotBar()
 */
CM.Disp.UpdateBotTimerBarPosition = function () {
	if (CM.Options.BotBar === 1 && CM.Options.TimerBar === 1 && CM.Options.TimerBarPos === 1) {
		CM.Disp.BotBar.style.bottom = CM.Disp.TimerBar.style.height;
		l('game').style.bottom = `${Number(CM.Disp.TimerBar.style.height.replace('px', '')) + 70}px`;
	} else if (CM.Options.BotBar === 1) {
		CM.Disp.BotBar.style.bottom = '0px';
		l('game').style.bottom = '70px';
	} else if (CM.Options.TimerBar === 1 && CM.Options.TimerBarPos === 1) {
		l('game').style.bottom = CM.Disp.TimerBar.style.height;
	} else { // No bars
		l('game').style.bottom = '0px';
	}

	if (CM.Options.TimerBar === 1 && CM.Options.TimerBarPos === 0) {
		l('sectionLeft').style.top = CM.Disp.TimerBar.style.height;
	} else {
		l('sectionLeft').style.top = '';
	}

	CM.Disp.UpdateBackground();
};

/**
 * Section: Functions related to right column of the screen (buildings/upgrades)

/**
 * This function adjusts some things in the column of buildings.
 * It colours them, helps display the correct sell-price and shuffles the order when CM.Options.SortBuildings is set
 * The function is called by CM.Disp.Draw(), CM.Disp.UpdateColors() & CM.Disp.RefreshScale()
 * And by changes in CM.Options.BuildColor, CM.Options.SortBuild & CM.Data.Config.BulkBuildColor
 */
CM.Disp.UpdateBuildings = function () {
	const target = `Objects${Game.buyBulk}`;
	if (Game.buyMode === 1) {
		if (CM.Options.BuildColor === 1) {
			for (const i of Object.keys(CM.Cache[target])) {
				l(`productPrice${Game.Objects[i].id}`).style.color = CM.Options.Colors[CM.Cache[target][i].color];
			}
		} else {
			for (const i of Object.keys(Game.Objects)) {
				l(`productPrice${Game.Objects[i].id}`).style.removeProperty('color');
			}
		}
	} else if (Game.buyMode === -1) {
		for (const i of Object.keys(CM.Cache.Objects1)) {
			const o = Game.Objects[i];
			l(`productPrice${o.id}`).style.color = '';
			/*
			 * Fix sell price displayed in the object in the store.
			 *
			 * The buildings sell price displayed by the game itself (without any mod) is incorrect.
			 * The following line of code fixes this issue, and can be safely removed when the game gets fixed.
			 *
			 * This issue is extensively detailed here: https://github.com/iasinme/Cookie-Clicker-AI/issues/359#issuecomment-735658262
			 */
			l(`productPrice${o.id}`).innerHTML = Beautify(CM.Sim.BuildingSell(o, o.basePrice, o.amount, o.free, Game.buyBulk, 1));
		}
	}

	// Build array of pointers, sort by pp, use array index (+2) as the grid row number
	// (grid rows are 1-based indexing, and row 1 is the bulk buy/sell options)
	// This regulates sorting of buildings
	if (Game.buyMode === 1 && CM.Options.SortBuildings) {
		const arr = Object.keys(CM.Cache[target]).map((k) => {
			const o = CM.Cache[target][k];
			o.name = k;
			o.id = Game.Objects[k].id;
			return o;
		});

		arr.sort(function (a, b) { return (CM.Disp.colors.indexOf(a.color) > CM.Disp.colors.indexOf(b.color) ? 1 : (CM.Disp.colors.indexOf(a.color) < CM.Disp.colors.indexOf(b.color) ? -1 : (a.pp < b.pp) ? -1 : 0)); });

		for (let x = 0; x < arr.length; x++) {
			Game.Objects[arr[x].name].l.style.gridRow = `${x + 2}/${x + 2}`;
		}
	} else {
		const arr = Object.keys(CM.Cache.Objects1).map((k) => {
			const o = CM.Cache.Objects1[k];
			o.name = k;
			o.id = Game.Objects[k].id;
			return o;
		});
		arr.sort((a, b) => a.id - b.id);
		for (let x = 0; x < arr.length; x++) {
			Game.Objects[arr[x].name].l.style.gridRow = `${x + 2}/${x + 2}`;
		}
	}
};

/**
 * This function adjusts some things in the upgrades section
 * It colours them and shuffles the order when CM.Options.SortBuildings is set
 * The function is called by CM.Disp.Draw(), CM.Disp.ToggleUpgradeBarAndColor & CM.Disp.RefreshScale()
 * And by changes in CM.Options.SortUpgrades
 */
CM.Disp.UpdateUpgrades = function () {
	// This counts the amount of upgrades for each pp group and updates the Upgrade Bar
	if (CM.Options.UpBarColor > 0) {
		let blue = 0;
		let green = 0;
		let yellow = 0;
		let orange = 0;
		let red = 0;
		let purple = 0;
		let gray = 0;

		for (const i of Object.keys(Game.UpgradesInStore)) {
			const me = Game.UpgradesInStore[i];
			let addedColor = false;
			for (let j = 0; j < l(`upgrade${i}`).childNodes.length; j++) {
				if (l(`upgrade${i}`).childNodes[j].className.indexOf(CM.Disp.colorBackPre) !== -1) {
					l(`upgrade${i}`).childNodes[j].className = CM.Disp.colorBackPre + CM.Cache.Upgrades[me.name].color;
					addedColor = true;
					break;
				}
			}
			if (!addedColor) {
				const div = document.createElement('div');
				div.style.width = '10px';
				div.style.height = '10px';
				div.className = CM.Disp.colorBackPre + CM.Cache.Upgrades[me.name].color;
				l(`upgrade${i}`).appendChild(div);
			}
			if (CM.Cache.Upgrades[me.name].color === CM.Disp.colorBlue) blue++;
			else if (CM.Cache.Upgrades[me.name].color === CM.Disp.colorGreen) green++;
			else if (CM.Cache.Upgrades[me.name].color === CM.Disp.colorYellow) yellow++;
			else if (CM.Cache.Upgrades[me.name].color === CM.Disp.colorOrange) orange++;
			else if (CM.Cache.Upgrades[me.name].color === CM.Disp.colorRed) red++;
			else if (CM.Cache.Upgrades[me.name].color === CM.Disp.colorPurple) purple++;
			else if (CM.Cache.Upgrades[me.name].color === CM.Disp.colorGray) gray++;
		}

		l('CMUpgradeBarBlue').textContent = blue;
		l('CMUpgradeBarGreen').textContent = green;
		l('CMUpgradeBarYellow').textContent = yellow;
		l('CMUpgradeBarOrange').textContent = orange;
		l('CMUpgradeBarRed').textContent = red;
		l('CMUpgradeBarPurple').textContent = purple;
		l('CMUpgradeBarGray').textContent = gray;
	}

	const arr = [];
	// Build array of pointers, sort by pp, set flex positions
	// This regulates sorting of upgrades
	for (let x = 0; x < Game.UpgradesInStore.length; x++) {
		const o = {};
		o.name = Game.UpgradesInStore[x].name;
		o.price = Game.UpgradesInStore[x].basePrice;
		o.pp = CM.Cache.Upgrades[o.name].pp;
		arr.push(o);
	}

	if (CM.Options.SortUpgrades) {
		arr.sort((a, b) => CM.Disp.colors.indexOf(a.color) - CM.Disp.colors.indexOf(b.color));
	} else {
		arr.sort((a, b) => a.price - b.price);
	}

	const nameChecker = function (arr2, upgrade) {
		return arr2.findIndex((e) => e.name === upgrade.name);
	};
	for (let x = 0; x < Game.UpgradesInStore.length; x++) {
		l(`upgrade${x}`).style.order = nameChecker(arr, Game.UpgradesInStore[x]) + 1;
	}
};

/**
 * Section: Functions related to the Upgrade Bar

/**
 * This function toggles the upgrade bar and the colours of upgrades
 * It is called by a change in CM.Options.UpBarColor
 */
CM.Disp.ToggleUpgradeBarAndColor = function () {
	if (CM.Options.UpBarColor === 1) { // Colours and bar on
		CM.Disp.UpgradeBar.style.display = '';
		CM.Disp.UpdateUpgrades();
	} else if (CM.Options.UpBarColor === 2) { // Colours on and bar off
		CM.Disp.UpgradeBar.style.display = 'none';
		CM.Disp.UpdateUpgrades();
	} else { // Colours and bar off
		CM.Disp.UpgradeBar.style.display = 'none';
		Game.RebuildUpgrades();
	}
};

/**
 * This function toggles the position of the upgrade bar from fixed or non-fixed mode
 * It is called by a change in CM.Options.UpgradeBarFixedPos
 */
CM.Disp.ToggleUpgradeBarFixedPos = function () {
	if (CM.Options.UpgradeBarFixedPos === 1) { // Fix to top of screen when scrolling
		CM.Disp.UpgradeBar.style.position = 'sticky';
		CM.Disp.UpgradeBar.style.top = '0px';
	} else {
		CM.Disp.UpgradeBar.style.position = ''; // Possible to scroll offscreen
	}
};

/**
 * This function creates the upgrade bar above the upgrade-section in the right section of the screen
 * The number (.textContent) of upgrades gets updated by CM.Disp.UpdateUpgrades()
 */
CM.Disp.CreateUpgradeBar = function () {
	CM.Disp.UpgradeBar = document.createElement('div');
	CM.Disp.UpgradeBar.id = 'CMUpgradeBar';
	CM.Disp.UpgradeBar.style.width = '100%';
	CM.Disp.UpgradeBar.style.backgroundColor = 'black';
	CM.Disp.UpgradeBar.style.textAlign = 'center';
	CM.Disp.UpgradeBar.style.fontWeight = 'bold';
	CM.Disp.UpgradeBar.style.display = 'none';
	CM.Disp.UpgradeBar.style.zIndex = '21';
	CM.Disp.UpgradeBar.onmouseout = function () { Game.tooltip.hide(); };

	const placeholder = document.createElement('div');
	placeholder.appendChild(CM.Disp.CreateUpgradeBarLegend());
	CM.Disp.UpgradeBar.onmouseover = function () { Game.tooltip.draw(this, escape(placeholder.innerHTML), 'store'); };

	const upgradeNumber = function (id, color) {
		const span = document.createElement('span');
		span.id = id;
		span.className = CM.Disp.colorTextPre + color;
		span.style.width = '14.28571428571429%';
		span.style.display = 'inline-block';
		span.textContent = '0';
		return span;
	};
	CM.Disp.UpgradeBar.appendChild(upgradeNumber('CMUpgradeBarBlue', CM.Disp.colorBlue));
	CM.Disp.UpgradeBar.appendChild(upgradeNumber('CMUpgradeBarGreen', CM.Disp.colorGreen));
	CM.Disp.UpgradeBar.appendChild(upgradeNumber('CMUpgradeBarYellow', CM.Disp.colorYellow));
	CM.Disp.UpgradeBar.appendChild(upgradeNumber('CMUpgradeBarOrange', CM.Disp.colorOrange));
	CM.Disp.UpgradeBar.appendChild(upgradeNumber('CMUpgradeBarRed', CM.Disp.colorRed));
	CM.Disp.UpgradeBar.appendChild(upgradeNumber('CMUpgradeBarPurple', CM.Disp.colorPurple));
	CM.Disp.UpgradeBar.appendChild(upgradeNumber('CMUpgradeBarGray', CM.Disp.colorGray));

	l('upgrades').parentNode.insertBefore(CM.Disp.UpgradeBar, l('upgrades').parentNode.childNodes[3]);
};

/**
 * This function creates the legend for the upgrade bar, it is called by CM.Disp.CreateUpgradeBar
 * @returns	{object}	legend	The legend-object to be added
 */
CM.Disp.CreateUpgradeBarLegend = function () {
	const legend = document.createElement('div');
	legend.style.minWidth = '330px';
	legend.style.marginBottom = '4px';
	const title = document.createElement('div');
	title.className = 'name';
	title.style.marginBottom = '4px';
	title.textContent = 'Legend';
	legend.appendChild(title);

	const legendLine = function (color, text) {
		const div = document.createElement('div');
		div.style.verticalAlign = 'middle';
		const span = document.createElement('span');
		span.className = CM.Disp.colorBackPre + color;
		span.style.display = 'inline-block';
		span.style.height = '10px';
		span.style.width = '10px';
		span.style.marginRight = '4px';
		div.appendChild(span);
		div.appendChild(document.createTextNode(text));
		return div;
	};

	legend.appendChild(legendLine(CM.Disp.colorBlue, 'Better than best PP building'));
	legend.appendChild(legendLine(CM.Disp.colorGreen, 'Same as best PP building'));
	legend.appendChild(legendLine(CM.Disp.colorYellow, 'Between best and worst PP buildings closer to best'));
	legend.appendChild(legendLine(CM.Disp.colorOrange, 'Between best and worst PP buildings closer to worst'));
	legend.appendChild(legendLine(CM.Disp.colorRed, 'Same as worst PP building'));
	legend.appendChild(legendLine(CM.Disp.colorPurple, 'Worse than worst PP building'));
	legend.appendChild(legendLine(CM.Disp.colorGray, 'Negative or infinity PP'));
	return legend;
};

/**
 * Section: Functions related to the flashes/sound/notifications

/**
 * This function creates a white square over the full screen and appends it to l('wrapper')
 * It is used by CM.Disp.Flash() to create the effect of a flash and called by CM.Main.DelayInit()
 */
CM.Disp.CreateWhiteScreen = function () {
	CM.Disp.WhiteScreen = document.createElement('div');
	CM.Disp.WhiteScreen.id = 'CMWhiteScreen';
	CM.Disp.WhiteScreen.style.width = '100%';
	CM.Disp.WhiteScreen.style.height = '100%';
	CM.Disp.WhiteScreen.style.backgroundColor = 'white';
	CM.Disp.WhiteScreen.style.display = 'none';
	CM.Disp.WhiteScreen.style.zIndex = '9999999999';
	CM.Disp.WhiteScreen.style.position = 'absolute';
	l('wrapper').appendChild(CM.Disp.WhiteScreen);
};

/**
 * This function creates a flash depending on configs. It is called by all functions
 * that check game-events and which have settings for Flashes (e.g., Golden Cookies appearing, Magic meter being full)
 * @param	{number}	mode	Sets the intensity of the flash, used to recursively dim flash
 * 								All calls of function have use mode === 3
 * @param	{string}	config	The setting in CM.Options that is checked before creating the flash
 */
CM.Disp.Flash = function (mode, config) {
	// The arguments check makes the sound not play upon initialization of the mod
	if ((CM.Options[config] === 1 && mode === 3 && CM.Footer.isInitzializing === false) || mode === 1) {
		CM.Disp.WhiteScreen.style.opacity = '0.5';
		if (mode === 3) {
			CM.Disp.WhiteScreen.style.display = 'inline';
			setTimeout(function () { CM.Disp.Flash(2, config); }, 1000 / Game.fps);
		} else {
			setTimeout(function () { CM.Disp.Flash(0, config); }, 1000 / Game.fps);
		}
	} else if (mode === 2) {
		CM.Disp.WhiteScreen.style.opacity = '1';
		setTimeout(function () { CM.Disp.Flash(1, config); }, 1000 / Game.fps);
	} else if (mode === 0) CM.Disp.WhiteScreen.style.display = 'none';
};

/**
 * This function plays a sound depending on configs. It is called by all functions
 * that check game-events and which have settings for sound (e.g., Golden Cookies appearing, Magic meter being full)
 * @param	{variable}	url			A variable that gives the url for the sound (e.g., CM.Options.GCSoundURL)
 * @param	{string}	sndConfig	The setting in CM.Options that is checked before creating the sound
 * @param	{string}	volConfig	The setting in CM.Options that is checked to determine volume
 */
CM.Disp.PlaySound = function (url, sndConfig, volConfig) {
	// The arguments check makes the sound not play upon initialization of the mod
	if (CM.Options[sndConfig] === 1 && CM.Footer.isInitzializing === false) {
		const sound = new realAudio(url);
		if (CM.Options.GeneralSound) sound.volume = (CM.Options[volConfig] / 100) * (Game.volume / 100);
		else sound.volume = (CM.Options[volConfig] / 100);
		sound.play();
	}
};

/**
 * This function creates a notifcation depending on configs. It is called by all functions
 * that check game-events and which have settings for notifications (e.g., Golden Cookies appearing, Magic meter being full)
 * @param	{string}	notifyConfig	The setting in CM.Options that is checked before creating the notification
 * @param	{string}	title			The title of the to-be created notifications
 * @param	{string}	message			The text of the to-be created notifications
 */
CM.Disp.Notification = function (notifyConfig, title, message) {
	// The arguments check makes the sound not play upon initialization of the mod
	if (CM.Options[notifyConfig] === 1 && document.visibilityState === 'hidden' && CM.Footer.isInitzializing === false) {
		const CookieIcon = 'https://orteil.dashnet.org/cookieclicker/favicon.ico';
		new Notification(title, { body: message, badge: CookieIcon });
	}
};

/**
 * Section: Functions related to updating the tab in the browser's tab-bar

/**
 * This function creates the Favicon, it is called by CM.Main.DelayInit()
 */
CM.Disp.CreateFavicon = function () {
	CM.Disp.Favicon = document.createElement('link');
	CM.Disp.Favicon.id = 'CMFavicon';
	CM.Disp.Favicon.rel = 'shortcut icon';
	CM.Disp.Favicon.href = 'https://orteil.dashnet.org/cookieclicker/favicon.ico';
	document.getElementsByTagName('head')[0].appendChild(CM.Disp.Favicon);
};

/**
 * This function updates the Favicon depending on whether a Golden Cookie has spawned
 * It is called on every loop by CM.Main.CheckGoldenCookie() or by a change in CM.Options.Favicon
 * By relying on CM.Cache.spawnedGoldenShimmer it only changes for non-user spawned cookie
 */
CM.Disp.UpdateFavicon = function () {
	if (CM.Options.Favicon === 1 && CM.Main.lastGoldenCookieState > 0) {
		if (CM.Cache.spawnedGoldenShimmer.wrath) CM.Disp.Favicon.href = 'https://iasinme.github.io/Cookie-Clicker-AI/favicon/wrathCookie.ico';
		else CM.Disp.Favicon.href = 'https://iasinme.github.io/Cookie-Clicker-AI/favicon/goldenCookie.ico';
	} else CM.Disp.Favicon.href = 'https://orteil.dashnet.org/cookieclicker/favicon.ico';
};

/**
 * This function updates the tab title
 * It is called on every loop by Game.Logic() which also sets CM.Disp.Title to Game.cookies
 */
CM.Disp.UpdateTitle = function () {
	if (Game.OnAscend || CM.Options.Title === 0) {
		document.title = CM.Disp.Title;
	} else if (CM.Options.Title === 1) {
		let addFC = false;
		let addSP = false;
		let titleGC;
		let titleFC;
		let titleSP;

		if (CM.Cache.spawnedGoldenShimmer) {
			if (CM.Cache.spawnedGoldenShimmer.wrath) titleGC = `[W${Math.ceil(CM.Cache.spawnedGoldenShimmer.life / Game.fps)}]`;
			else titleGC = `[G${Math.ceil(CM.Cache.spawnedGoldenShimmer.life / Game.fps)}]`;
		} else if (!Game.Has('Golden switch [off]')) {
			titleGC = `[${Number(l('CMTimerBarGCMinBar').textContent) < 0 ? '!' : ''}${Math.ceil((Game.shimmerTypes.golden.maxTime - Game.shimmerTypes.golden.time) / Game.fps)}]`;
		} else titleGC = '[GS]';

		if (CM.Main.lastTickerFortuneState) {
			addFC = true;
			titleFC = '[F]';
		}

		if (Game.season === 'christmas') {
			addSP = true;
			if (CM.Main.lastSeasonPopupState) titleSP = `[R${Math.ceil(CM.Cache.seasonPopShimmer.life / Game.fps)}]`;
			else {
				titleSP = `[${Number(l('CMTimerBarRenMinBar').textContent) < 0 ? '!' : ''}${Math.ceil((Game.shimmerTypes.reindeer.maxTime - Game.shimmerTypes.reindeer.time) / Game.fps)}]`;
			}
		}

		// Remove previous timers and add current cookies
		let str = CM.Disp.Title;
		if (str.charAt(0) === '[') {
			str = str.substring(str.lastIndexOf(']') + 1);
		}
		document.title = `${titleGC + (addFC ? titleFC : '') + (addSP ? titleSP : '')} ${str}`;
	} else if (CM.Options.Title === 2) {
		let str = '';
		let spawn = false;
		if (CM.Cache.spawnedGoldenShimmer) {
			spawn = true;
			if (CM.Cache.spawnedGoldenShimmer.wrath) str += `[W${Math.ceil(CM.Cache.spawnedGoldenShimmer.life / Game.fps)}]`;
			else str += `[G${Math.ceil(CM.Cache.spawnedGoldenShimmer.life / Game.fps)}]`;
		}
		if (CM.Main.lastTickerFortuneState) {
			spawn = true;
			str += '[F]';
		}
		if (Game.season === 'christmas' && CM.Main.lastSeasonPopupState) {
			str += `[R${Math.ceil(CM.Cache.seasonPopShimmer.life / Game.fps)}]`;
			spawn = true;
		}
		if (spawn) str += ' - ';
		let title = 'Cookie Clicker';
		if (Game.season === 'fools') title = 'Cookie Baker';
		str += title;
		document.title = str;
	}
};

/**
 * Section: Functions related to the Golden Cookie Timers

/**
 * This function creates a new Golden Cookie Timer and appends it CM.Disp.GCTimers based on the id of the cookie
 * It is called by CM.Main.CheckGoldenCookie()
 * @param	{object}	cookie	A Golden Cookie object
 */
CM.Disp.CreateGCTimer = function (cookie) {
	const GCTimer = document.createElement('div');
	GCTimer.id = `GCTimer${cookie.id}`;
	GCTimer.style.width = '96px';
	GCTimer.style.height = '96px';
	GCTimer.style.position = 'absolute';
	GCTimer.style.zIndex = '10000000001';
	GCTimer.style.textAlign = 'center';
	GCTimer.style.lineHeight = '96px';
	GCTimer.style.fontFamily = '"Kavoon", Georgia, serif';
	GCTimer.style.fontSize = '35px';
	GCTimer.style.cursor = 'pointer';
	GCTimer.style.display = 'block';
	if (CM.Options.GCTimer === 0) GCTimer.style.display = 'none';
	GCTimer.style.left = cookie.l.style.left;
	GCTimer.style.top = cookie.l.style.top;
	GCTimer.onclick = function () { cookie.pop(); };
	GCTimer.onmouseover = function () { cookie.l.style.filter = 'brightness(125%) drop-shadow(0px 0px 3px rgba(255,255,255,1))'; cookie.l.style.webkitFilter = 'brightness(125%) drop-shadow(0px 0px 3px rgba(255,255,255,1))'; };
	GCTimer.onmouseout = function () { cookie.l.style.filter = ''; cookie.l.style.webkitFilter = ''; };

	CM.Disp.GCTimers[cookie.id] = GCTimer;
	l('shimmers').appendChild(GCTimer);
};

/**
 * This function toggles GC Timers are visible
 * It is called by a change in CM.Options.GCTimer
 */
CM.Disp.ToggleGCTimer = function () {
	if (CM.Options.GCTimer === 1) {
		for (const i of Object.keys(CM.Disp.GCTimers)) {
			CM.Disp.GCTimers[i].style.display = 'block';
			CM.Disp.GCTimers[i].style.left = CM.Cache.goldenShimmersByID[i].l.style.left;
			CM.Disp.GCTimers[i].style.top = CM.Cache.goldenShimmersByID[i].l.style.top;
		}
	} else {
		for (const i of Object.keys(CM.Disp.GCTimers)) CM.Disp.GCTimers[i].style.display = 'none';
	}
};

/**
 * Section: Functions related to Tooltips

/**
 * This function creates some very basic tooltips, (e.g., the tooltips in the stats page)
 * The tooltips are created with CM.Disp[placeholder].appendChild(desc)
 * It is called by CM.Main.DelayInit()
 * @param	{string}	placeholder	The name used to later refer and spawn the tooltip
 * @param	{string}	text		The text of the tooltip
 * @param	{string}	minWidth	The minimum width of the tooltip
 */
CM.Disp.CreateSimpleTooltip = function (placeholder, text, minWidth) {
	CM.Disp[placeholder] = document.createElement('div');
	const desc = document.createElement('div');
	desc.style.minWidth = minWidth;
	desc.style.marginBottom = '4px';
	const div = document.createElement('div');
	div.style.textAlign = 'left';
	div.textContent = text;
	desc.appendChild(div);
	CM.Disp[placeholder].appendChild(desc);
};

/**
 * This function replaces the original .onmouseover functions of upgrades so that it calls CM.Disp.Tooltip()
 * CM.Disp.Tooltip() sets the tooltip type to 'u'
 * It is called by Game.RebuildUpgrades() through CM.Main.ReplaceNative() and is therefore not permanent like the other ReplaceTooltip functions
 */
CM.Disp.ReplaceTooltipUpgrade = function () {
	CM.Disp.TooltipUpgradeBackup = [];
	for (const i of Object.keys(Game.UpgradesInStore)) {
		if (l(`upgrade${i}`).onmouseover !== null) {
			CM.Disp.TooltipUpgradeBackup[i] = l(`upgrade${i}`).onmouseover;
			l(`upgrade${i}`).onmouseover = function () { if (!Game.mouseDown) { Game.setOnCrate(this); Game.tooltip.dynamic = 1; Game.tooltip.draw(this, function () { return CM.Disp.Tooltip('u', `${i}`); }, 'store'); Game.tooltip.wobble(); } };
		}
	}
};

/**
 * This function enhance the standard tooltips by creating and changing l('tooltip')
 * The function is called by .onmouseover events that have replaced original code to use CM.Disp.Tooltip()
 * @param	{string}	type					Type of tooltip (b, u, s or g)
 * @param	{string}	name					Name of the object/item the tooltip relates to
 * @returns {string}	l('tooltip').innerHTML	The HTML of the l('tooltip')-object
 */
CM.Disp.Tooltip = function (type, name) {
	if (type === 'b') { // Buildings
		l('tooltip').innerHTML = Game.Objects[name].tooltip();
		// Adds amortization info to the list of info per building
		if (CM.Options.TooltipAmor === 1) {
			const buildPrice = CM.Sim.BuildingGetPrice(Game.Objects[name], Game.Objects[name].basePrice, 0, Game.Objects[name].free, Game.Objects[name].amount);
			const amortizeAmount = buildPrice - Game.Objects[name].totalCookies;
			if (amortizeAmount > 0) {
				l('tooltip').innerHTML = l('tooltip').innerHTML
					.split('so far</div>')
					.join(`so far<br/>&bull; <b>${Beautify(amortizeAmount)}</b> ${Math.floor(amortizeAmount) === 1 ? 'cookie' : 'cookies'} left to amortize (${CM.Disp.GetTimeColor((buildPrice - Game.Objects[name].totalCookies) / (Game.Objects[name].storedTotalCps * Game.globalCpsMult)).text})</div>`);
			}
		}
		if (Game.buyMode === -1) {
			/*
			 * Fix sell price displayed in the object tooltip.
			 *
			 * The buildings sell price displayed by the game itself (without any mod) is incorrect.
			 * The following line of code fixes this issue, and can be safely removed when the game gets fixed.
			 *
			 * This issue is extensively detailed here: https://github.com/iasinme/Cookie-Clicker-AI/issues/359#issuecomment-735658262
			 */
			l('tooltip').innerHTML = l('tooltip').innerHTML.split(Beautify(Game.Objects[name].bulkPrice)).join(Beautify(CM.Sim.BuildingSell(Game.Objects[name], Game.Objects[name].basePrice, Game.Objects[name].amount, Game.Objects[name].free, Game.buyBulk, 1)));
		}
	} else if (type === 'u') { // Upgrades
		if (!Game.UpgradesInStore[name]) return '';
		l('tooltip').innerHTML = Game.crateTooltip(Game.UpgradesInStore[name], 'store');
	} else if (type === 's') l('tooltip').innerHTML = Game.lumpTooltip(); // Sugar Lumps
	else if (type === 'g') l('tooltip').innerHTML = Game.Objects['Wizard tower'].minigame.spellTooltip(name)(); // Grimoire
	else if (type === 'p') l('tooltip').innerHTML = Game.ObjectsById[2].minigame.tileTooltip(name[0], name[1])(); // Garden plots
	else if (type === 'ha') l('tooltip').innerHTML = Game.ObjectsById[2].minigame.toolTooltip(1)(); // Harvest all button in garden

	// Adds area for extra tooltip-sections
	if ((type === 'b' && Game.buyMode === 1) || type === 'u' || type === 's' || type === 'g' || type === 'p' || type === 'ha') {
		const area = document.createElement('div');
		area.id = 'CMTooltipArea';
		l('tooltip').appendChild(area);
	}

	// Sets global variables used by CM.Disp.UpdateTooltip()
	CM.Disp.tooltipType = type;
	CM.Disp.tooltipName = name;

	CM.Disp.UpdateTooltip();

	return l('tooltip').innerHTML;
};

/**
 * This function creates a tooltipBox object which contains all CookieMonster added tooltip information.
 * It is called by all CM.Disp.UpdateTooltip functions.
 * @returns {object}	div		An object containing the stylized box
 */
CM.Disp.TooltipCreateTooltipBox = function () {
	l('tooltip').firstChild.style.paddingBottom = '4px'; // Sets padding on base-tooltip
	const tooltipBox = document.createElement('div');
	tooltipBox.style.border = '1px solid';
	tooltipBox.style.padding = '4px';
	tooltipBox.style.margin = '0px -4px';
	tooltipBox.id = 'CMTooltipBorder';
	tooltipBox.className = CM.Disp.colorTextPre + CM.Disp.colorGray;
	return tooltipBox;
};

/**
 * This function creates a header object for tooltips.
 * It is called by all CM.Disp.UpdateTooltip functions.
 * @param	{string}	text	Title of header
 * @returns {object}	div		An object containing the stylized header
 */
CM.Disp.TooltipCreateHeader = function (text) {
	const div = document.createElement('div');
	div.style.fontWeight = 'bold';
	div.className = CM.Disp.colorTextPre + CM.Disp.colorBlue;
	div.textContent = text;
	return div;
};

/**
 * This function appends the sections for Bonus Income, PP and Time left (to achiev) to the tooltip-object
 * It is called by CM.Disp.UpdateTooltipBuilding() and CM.Disp.UpdateTooltipUpgrade()
 * The actual data is added by the Update-functions themselves
 * @param	{object}	tooltip		Object of a TooltipBox, normally created by a call to CM.Disp.TooltipCreateTooltipBox()
 */
CM.Disp.TooltipCreateCalculationSection = function (tooltip) {
	tooltip.appendChild(CM.Disp.TooltipCreateHeader('Bonus Income'));
	const income = document.createElement('div');
	income.style.marginBottom = '4px';
	income.style.color = 'white';
	income.id = 'CMTooltipIncome';
	tooltip.appendChild(income);

	tooltip.appendChild(CM.Disp.TooltipCreateHeader('Bonus Cookies per Click'));
	tooltip.lastChild.style.display = 'none';
	const click = document.createElement('div');
	click.style.marginBottom = '4px';
	click.style.color = 'white';
	click.style.display = 'none';
	click.id = 'CMTooltipCookiePerClick';
	tooltip.appendChild(click);

	tooltip.appendChild(CM.Disp.TooltipCreateHeader('Payback Period'));
	const pp = document.createElement('div');
	pp.style.marginBottom = '4px';
	pp.id = 'CMTooltipPP';
	tooltip.appendChild(pp);

	tooltip.appendChild(CM.Disp.TooltipCreateHeader('Time Left'));
	const time = document.createElement('div');
	time.id = 'CMTooltipTime';
	tooltip.appendChild(time);

	if (CM.Disp.tooltipType === 'b') {
		tooltip.appendChild(CM.Disp.TooltipCreateHeader('Production left till next achievement'));
		tooltip.lastChild.id = 'CMTooltipProductionHeader'; // Assign a id in order to hid when no achiev's are left
		const production = document.createElement('div');
		production.id = 'CMTooltipProduction';
		tooltip.appendChild(production);
	}
};

/**
 * This function creates the tooltip objectm for warnings
 * It is called by CM.Disp.UpdateTooltipWarnings() whenever the tooltip type is 'b' or 'u'
 * The object is also removed by CM.Disp.UpdateTooltipWarnings() when type is 's' or 'g'
 * @returns {object}	CM.Disp.TooltipWarn	The Warnings-tooltip object
 */
CM.Disp.TooltipCreateWarningSection = function () {
	CM.Disp.TooltipWarn = document.createElement('div');
	CM.Disp.TooltipWarn.style.position = 'absolute';
	CM.Disp.TooltipWarn.style.display = 'block';
	CM.Disp.TooltipWarn.style.left = 'auto';
	CM.Disp.TooltipWarn.style.bottom = 'auto';
	CM.Disp.TooltipWarn.id = 'CMDispTooltipWarningParent';

	const create = function (boxId, color, labelTextFront, labelTextBack, deficitId) {
		const box = document.createElement('div');
		box.id = boxId;
		box.style.display = 'none';
		box.style.transition = 'opacity 0.1s ease-out';
		box.className = CM.Disp.colorBorderPre + color;
		box.style.padding = '2px';
		box.style.background = '#000 url(img/darkNoise.png)';
		const labelDiv = document.createElement('div');
		box.appendChild(labelDiv);
		const labelSpan = document.createElement('span');
		labelSpan.className = CM.Disp.colorTextPre + color;
		labelSpan.style.fontWeight = 'bold';
		labelSpan.textContent = labelTextFront;
		labelDiv.appendChild(labelSpan);
		labelDiv.appendChild(document.createTextNode(labelTextBack));
		const deficitDiv = document.createElement('div');
		box.appendChild(deficitDiv);
		const deficitSpan = document.createElement('span');
		deficitSpan.id = deficitId;
		deficitDiv.appendChild(document.createTextNode('Deficit: '));
		deficitDiv.appendChild(deficitSpan);
		return box;
	};

	CM.Disp.TooltipWarn.appendChild(create('CMDispTooltipWarnLucky', CM.Disp.colorRed, 'Warning: ', 'Purchase of this item will put you under the number of Cookies required for "Lucky!"', 'CMDispTooltipWarnLuckyText'));
	CM.Disp.TooltipWarn.firstChild.style.marginBottom = '4px';
	CM.Disp.TooltipWarn.appendChild(create('CMDispTooltipWarnLuckyFrenzy', CM.Disp.colorYellow, 'Warning: ', 'Purchase of this item will put you under the number of Cookies required for "Lucky!" (Frenzy)', 'CMDispTooltipWarnLuckyFrenzyText'));
	CM.Disp.TooltipWarn.lastChild.style.marginBottom = '4px';
	CM.Disp.TooltipWarn.appendChild(create('CMDispTooltipWarnConjure', CM.Disp.colorPurple, 'Warning: ', 'Purchase of this item will put you under the number of Cookies required for "Conjure Baked Goods"', 'CMDispTooltipWarnConjureText'));
	CM.Disp.TooltipWarn.lastChild.style.marginBottom = '4px';
	CM.Disp.TooltipWarn.appendChild(create('CMDispTooltipWarnConjureFrenzy', CM.Disp.colorPurple, 'Warning: ', 'Purchase of this item will put you under the number of Cookies required for "Conjure Baked Goods" (Frenzy)', 'CMDispTooltipWarnConjureFrenzyText'));
	if (Game.Objects['Wizard tower'].minigameLoaded) {
		CM.Disp.TooltipWarn.lastChild.style.marginBottom = '4px';
		CM.Disp.TooltipWarn.appendChild(create('CMDispTooltipWarnEdifice', CM.Disp.colorPurple, 'Warning: ', 'Purchase of this item will put you under the number of Cookies needed for "Spontaneous Edifice" to possibly give you your most expensive building"', 'CMDispTooltipWarnEdificeText'));
	}
	CM.Disp.TooltipWarn.lastChild.style.marginBottom = '4px';
	CM.Disp.TooltipWarn.appendChild(create('CMDispTooltipWarnUser', CM.Disp.colorRed, 'Warning: ', `Purchase of this item will put you under the number of Cookies equal to ${CM.Options.ToolWarnUser} seconds of CPS`, 'CMDispTooltipWarnUserText'));

	return CM.Disp.TooltipWarn;
};

/**
 * This function updates the sections of the tooltips created by CookieMonster
 * It is called when tooltips are created by and CM.Disp.Tooltip() on every loop by CM.Disp.Draw()
 */
CM.Disp.UpdateTooltip = function () {
	CM.Sim.CopyData();
	if (l('tooltipAnchor').style.display !== 'none' && l('CMTooltipArea')) {
		l('CMTooltipArea').innerHTML = '';
		const tooltipBox = CM.Disp.TooltipCreateTooltipBox();
		l('CMTooltipArea').appendChild(tooltipBox);

		if (CM.Disp.tooltipType === 'b') {
			CM.Disp.UpdateTooltipBuilding();
		} else if (CM.Disp.tooltipType === 'u') {
			CM.Disp.UpdateTooltipUpgrade();
		} else if (CM.Disp.tooltipType === 's') {
			CM.Disp.UpdateTooltipSugarLump();
		} else if (CM.Disp.tooltipType === 'g') {
			CM.Disp.UpdateTooltipGrimoire();
		} else if (CM.Disp.tooltipType === 'p') {
			CM.Disp.UpdateTooltipGardenPlots();
		} else if (CM.Disp.tooltipType === 'ha') {
			CM.Disp.UpdateTooltipHarvestAll();
		}
		CM.Disp.UpdateTooltipWarnings();
	} else if (l('CMTooltipArea') === null) { // Remove warnings if its a basic tooltip
		if (l('CMDispTooltipWarningParent') !== null) {
			l('CMDispTooltipWarningParent').remove();
		}
	}
};

/**
 * This function adds extra info to the Building tooltips
 * It is called when Building tooltips are created or refreshed by CM.Disp.UpdateTooltip()
 */
CM.Disp.UpdateTooltipBuilding = function () {
	if (CM.Options.TooltipBuildUpgrade === 1 && Game.buyMode === 1) {
		const tooltipBox = l('CMTooltipBorder');
		CM.Disp.TooltipCreateCalculationSection(tooltipBox);

		const target = `Objects${Game.buyBulk}`;

		CM.Disp.TooltipPrice = Game.Objects[CM.Disp.tooltipName].bulkPrice;
		CM.Disp.TooltipBonusIncome = CM.Cache[target][CM.Disp.tooltipName].bonus;

		if (CM.Options.TooltipBuildUpgrade === 1 && Game.buyMode === 1) {
			l('CMTooltipIncome').textContent = Beautify(CM.Disp.TooltipBonusIncome, 2);
			const increase = Math.round(CM.Disp.TooltipBonusIncome / Game.cookiesPs * 10000);
			if (Number.isFinite(increase) && increase !== 0) {
				l('CMTooltipIncome').textContent += ` (${increase / 100}% of income)`;
			}
			l('CMTooltipBorder').className = CM.Disp.colorTextPre + CM.Cache[target][CM.Disp.tooltipName].color;
			l('CMTooltipPP').textContent = Beautify(CM.Cache[target][CM.Disp.tooltipName].pp, 2);
			l('CMTooltipPP').className = CM.Disp.colorTextPre + CM.Cache[target][CM.Disp.tooltipName].color;
			const timeColor = CM.Disp.GetTimeColor((CM.Disp.TooltipPrice - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS());
			l('CMTooltipTime').textContent = timeColor.text;
			if (timeColor.text === 'Done!' && Game.cookies < CM.Cache[target][CM.Disp.tooltipName].price) {
				l('CMTooltipTime').textContent = `${timeColor.text} (with Wrink)`;
			} else l('CMTooltipTime').textContent = timeColor.text;
			l('CMTooltipTime').className = CM.Disp.colorTextPre + timeColor.color;
		}

		// Add "production left till next achievement"-bar
		l('CMTooltipProductionHeader').style.display = 'none';
		l('CMTooltipTime').style.marginBottom = '0px';
		for (const i of Object.keys(Game.Objects[CM.Disp.tooltipName].productionAchievs)) {
			if (!Game.HasAchiev(Game.Objects[CM.Disp.tooltipName].productionAchievs[i].achiev.name)) {
				const nextProductionAchiev = Game.Objects[CM.Disp.tooltipName].productionAchievs[i];
				l('CMTooltipTime').style.marginBottom = '4px';
				l('CMTooltipProductionHeader').style.display = '';
				l('CMTooltipProduction').className = `ProdAchievement${CM.Disp.tooltipName}`;
				l('CMTooltipProduction').textContent = Beautify(nextProductionAchiev.pow - CM.Sim.Objects[CM.Disp.tooltipName].totalCookies, 15);
				l('CMTooltipProduction').style.color = 'white';
				break;
			}
		}
	} else l('CMTooltipArea').style.display = 'none';
};

/**
 * This function adds extra info to the Upgrade tooltips
 * It is called when Upgrade tooltips are created or refreshed by CM.Disp.UpdateTooltip()
 */
CM.Disp.UpdateTooltipUpgrade = function () {
	const tooltipBox = l('CMTooltipBorder');
	CM.Disp.TooltipCreateCalculationSection(tooltipBox);

	CM.Disp.TooltipBonusIncome = CM.Cache.Upgrades[Game.UpgradesInStore[CM.Disp.tooltipName].name].bonus;
	CM.Disp.TooltipPrice = Game.Upgrades[Game.UpgradesInStore[CM.Disp.tooltipName].name].getPrice();
	CM.Disp.TooltipBonusMouse = CM.Cache.Upgrades[Game.UpgradesInStore[CM.Disp.tooltipName].name].bonusMouse;

	if (CM.Options.TooltipBuildUpgrade === 1) {
		l('CMTooltipIncome').textContent = Beautify(CM.Disp.TooltipBonusIncome, 2);
		const increase = Math.round(CM.Disp.TooltipBonusIncome / Game.cookiesPs * 10000);
		if (Number.isFinite(increase) && increase !== 0) {
			l('CMTooltipIncome').textContent += ` (${increase / 100}% of income)`;
		}
		l('CMTooltipBorder').className = CM.Disp.colorTextPre + CM.Cache.Upgrades[Game.UpgradesInStore[CM.Disp.tooltipName].name].color;
		// If clicking power upgrade
		if (CM.Disp.TooltipBonusMouse) {
			l('CMTooltipCookiePerClick').textContent = Beautify(CM.Disp.TooltipBonusMouse);
			l('CMTooltipCookiePerClick').style.display = 'block';
			l('CMTooltipCookiePerClick').previousSibling.style.display = 'block';
		}
		// If only a clicking power upgrade change PP to click-based period
		if (CM.Disp.TooltipBonusIncome === 0 && CM.Disp.TooltipBonusMouse) {
			l('CMTooltipPP').textContent = `${Beautify(CM.Disp.TooltipPrice / CM.Disp.TooltipBonusMouse)} Clicks`;
			l('CMTooltipPP').style.color = 'white';
		} else {
			l('CMTooltipPP').textContent = Beautify(CM.Cache.Upgrades[Game.UpgradesInStore[CM.Disp.tooltipName].name].pp, 2);
			l('CMTooltipPP').className = CM.Disp.colorTextPre + CM.Cache.Upgrades[Game.UpgradesInStore[CM.Disp.tooltipName].name].color;
		}
		const timeColor = CM.Disp.GetTimeColor((CM.Disp.TooltipPrice - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS());
		l('CMTooltipTime').textContent = timeColor.text;
		if (timeColor.text === 'Done!' && Game.cookies < Game.UpgradesInStore[CM.Disp.tooltipName].getPrice()) {
			l('CMTooltipTime').textContent = `${timeColor.text} (with Wrink)`;
		} else l('CMTooltipTime').textContent = timeColor.text;
		l('CMTooltipTime').className = CM.Disp.colorTextPre + timeColor.color;

		// Add extra info to Chocolate egg tooltip
		if (Game.UpgradesInStore[CM.Disp.tooltipName].name === 'Chocolate egg') {
			l('CMTooltipBorder').lastChild.style.marginBottom = '4px';
			l('CMTooltipBorder').appendChild(CM.Disp.TooltipCreateHeader('Cookies to be gained (Currently/Max)'));
			const chocolate = document.createElement('div');
			chocolate.style.color = 'white';
			chocolate.textContent = `${CM.Disp.Beautify(Game.cookies * 0.05)} / ${CM.Disp.Beautify(CM.Cache.lastChoEgg)}`;
			l('CMTooltipBorder').appendChild(chocolate);
		}
	} else l('CMTooltipArea').style.display = 'none';
};

/**
 * This function adds extra info to the Sugar Lump tooltip
 * It is called when the Sugar Lump tooltip is created or refreshed by CM.Disp.UpdateTooltip()
 * It adds to the additional information to l('CMTooltipArea')
 */
CM.Disp.UpdateTooltipSugarLump = function () {
	if (CM.Options.TooltipLump === 1) {
		const tooltipBox = l('CMTooltipBorder');

		tooltipBox.appendChild(CM.Disp.TooltipCreateHeader('Current Sugar Lump'));

		const lumpType = document.createElement('div');
		lumpType.id = 'CMTooltipTime';
		tooltipBox.appendChild(lumpType);
		const lumpColor = CM.Disp.GetLumpColor(Game.lumpCurrentType);
		lumpType.textContent = lumpColor.text;
		lumpType.className = CM.Disp.colorTextPre + lumpColor.color;
	} else l('CMTooltipArea').style.display = 'none';
};

/**
 * This function adds extra info to the Grimoire tooltips
 * It is called when Grimoire tooltips are created or refreshed by CM.Disp.UpdateTooltip()
 * It adds to the additional information to l('CMTooltipArea')
 */
CM.Disp.UpdateTooltipGrimoire = function () {
	const minigame = Game.Objects['Wizard tower'].minigame;
	const spellCost = minigame.getSpellCost(minigame.spellsById[CM.Disp.tooltipName]);

	if (CM.Options.TooltipGrim === 1 && spellCost <= minigame.magicM) {
		const tooltipBox = l('CMTooltipBorder');

		// Time left till enough magic for spell
		tooltipBox.appendChild(CM.Disp.TooltipCreateHeader('Time Left'));
		const time = document.createElement('div');
		time.id = 'CMTooltipTime';
		tooltipBox.appendChild(time);
		const timeColor = CM.Disp.GetTimeColor(CM.Disp.CalculateGrimoireRefillTime(minigame.magic, minigame.magicM, spellCost));
		time.textContent = timeColor.text;
		time.className = CM.Disp.colorTextPre + timeColor.color;

		// Time left untill magic spent is recovered
		if (spellCost <= minigame.magic) {
			tooltipBox.appendChild(CM.Disp.TooltipCreateHeader('Recover Time'));
			const recover = document.createElement('div');
			recover.id = 'CMTooltipRecover';
			tooltipBox.appendChild(recover);
			const recoverColor = CM.Disp.GetTimeColor(CM.Disp.CalculateGrimoireRefillTime(Math.max(0, minigame.magic - spellCost), minigame.magicM, minigame.magic));
			recover.textContent = recoverColor.text;
			recover.className = CM.Disp.colorTextPre + recoverColor.color;
		}

		// Extra information on cookies gained when spell is Conjure Baked Goods (Name === 0)
		if (CM.Disp.tooltipName === 0) {
			tooltipBox.appendChild(CM.Disp.TooltipCreateHeader('Cookies to be gained/lost'));
			const conjure = document.createElement('div');
			conjure.id = 'CMTooltipConjure';
			tooltipBox.appendChild(conjure);
			const reward = document.createElement('span');
			reward.style.color = '#33FF00';
			reward.textContent = Beautify(Math.min((Game.cookies + CM.Disp.GetWrinkConfigBank()) * 0.15, CM.Cache.NoGoldSwitchCookiesPS * 60 * 30), 2);
			conjure.appendChild(reward);
			const seperator = document.createElement('span');
			seperator.textContent = ' / ';
			conjure.appendChild(seperator);
			const loss = document.createElement('span');
			loss.style.color = 'red';
			loss.textContent = Beautify((CM.Cache.NoGoldSwitchCookiesPS * 60 * 15), 2);
			conjure.appendChild(loss);
		}

		l('CMTooltipArea').appendChild(tooltipBox);
	} else l('CMTooltipArea').style.display = 'none';
};

/**
 * This function adds extra info to the Garden plots tooltips
 * It is called when Garden plots tooltips are created or refreshed by CM.Disp.UpdateTooltip()
 * It adds to the additional information to l('CMTooltipArea')
 */
CM.Disp.UpdateTooltipGardenPlots = function () {
	const minigame = Game.Objects.Farm.minigame;
	if (CM.Options.TooltipLump && minigame.plot[CM.Disp.tooltipName[1]][CM.Disp.tooltipName[0]][0] !== 0) {
		const mature = minigame.plot[CM.Disp.tooltipName[1]][CM.Disp.tooltipName[0]][1] > minigame.plantsById[minigame.plot[CM.Disp.tooltipName[1]][CM.Disp.tooltipName[0]][0] - 1].matureBase;
		const plantName = minigame.plantsById[minigame.plot[CM.Disp.tooltipName[1]][CM.Disp.tooltipName[0]][0] - 1].name;
		l('CMTooltipBorder').appendChild(CM.Disp.TooltipCreateHeader('Reward (Current / Maximum)'));
		const reward = document.createElement('div');
		reward.id = 'CMTooltipPlantReward';
		l('CMTooltipBorder').appendChild(reward);
		if (plantName === 'Bakeberry') {
			l('CMTooltipPlantReward').textContent = `${mature ? CM.Disp.Beautify(Math.min(Game.cookies * 0.03, Game.cookiesPs * 60 * 30)) : '0'} / ${CM.Disp.Beautify(Game.cookiesPs * 60 * 30)}`;
		} else if (plantName === 'Chocoroot' || plantName === 'White chocoroot') {
			l('CMTooltipPlantReward').textContent = `${mature ? CM.Disp.Beautify(Math.min(Game.cookies * 0.03, Game.cookiesPs * 60 * 3)) : '0'} / ${CM.Disp.Beautify(Game.cookiesPs * 60 * 3)}`;
		} else if (plantName === 'Queenbeet') {
			l('CMTooltipPlantReward').textContent = `${mature ? CM.Disp.Beautify(Math.min(Game.cookies * 0.04, Game.cookiesPs * 60 * 60)) : '0'} / ${CM.Disp.Beautify(Game.cookiesPs * 60 * 60)}`;
		} else if (plantName === 'Duketater') {
			l('CMTooltipPlantReward').textContent = `${mature ? CM.Disp.Beautify(Math.min(Game.cookies * 0.08, Game.cookiesPs * 60 * 120)) : '0'} / ${CM.Disp.Beautify(Game.cookiesPs * 60 * 120)}`;
		} else l('CMTooltipArea').style.display = 'none';
	} else l('CMTooltipArea').style.display = 'none';
};

/**
 * This function adds extra info to the Garden Harvest All tooltip
 * It is called when the Harvest All tooltip is created or refreshed by CM.Disp.UpdateTooltip()
 * It adds to the additional information to l('CMTooltipArea')
 */
CM.Disp.UpdateTooltipHarvestAll = function () {
	const minigame = Game.Objects.Farm.minigame;
	if (CM.Options.TooltipLump) {
		l('CMTooltipBorder').appendChild(CM.Disp.TooltipCreateHeader('Cookies gained from harvesting:'));
		let totalGain = 0;
		let mortal = 0;
		if (Game.keys[16] && Game.keys[17]) mortal = 1;
		for (let y = 0; y < 6; y++) {
			for (let x = 0; x < 6; x++) {
				if (minigame.plot[y][x][0] >= 1) {
					const tile = minigame.plot[y][x];
					const me = minigame.plantsById[tile[0] - 1];
					const plantName = me.name;

					let count = true;
					if (mortal && me.immortal) count = false;
					if (tile[1] < me.matureBase) count = false;
					if (count && plantName === 'Bakeberry') {
						totalGain += Math.min(Game.cookies * 0.03, Game.cookiesPs * 60 * 30);
					} else if (count && plantName === 'Chocoroot' || plantName === 'White chocoroot') {
						totalGain += Math.min(Game.cookies * 0.03, Game.cookiesPs * 60 * 3);
					} else if (count && plantName === 'Queenbeet') {
						totalGain += Math.min(Game.cookies * 0.04, Game.cookiesPs * 60 * 60);
					} else if (count && plantName === 'Duketater') {
						totalGain += Math.min(Game.cookies * 0.08, Game.cookiesPs * 60 * 120);
					}
				}
			}
		}
		l('CMTooltipBorder').appendChild(document.createTextNode(CM.Disp.Beautify(totalGain)));
	} else l('CMTooltipArea').style.display = 'none';
};

/**
 * This function updates the warnings section of the building and upgrade tooltips
 * It is called by CM.Disp.UpdateTooltip()
 */
CM.Disp.UpdateTooltipWarnings = function () {
	if (CM.Disp.tooltipType === 'b' || CM.Disp.tooltipType === 'u') {
		if (document.getElementById('CMDispTooltipWarningParent') === null) {
			const warningTooltip = CM.Disp.TooltipCreateWarningSection();
			l('tooltipAnchor').appendChild(warningTooltip);
			CM.Disp.ToggleToolWarnPos();
		}

		if (CM.Options.ToolWarnPos === 0) CM.Disp.TooltipWarn.style.right = '0px';
		else CM.Disp.TooltipWarn.style.top = `${l('tooltip').offsetHeight}px`;

		CM.Disp.TooltipWarn.style.width = `${l('tooltip').offsetWidth - 6}px`;

		const amount = (Game.cookies + CM.Disp.GetWrinkConfigBank()) - CM.Disp.TooltipPrice;
		let limitLucky = CM.Cache.Lucky;
		if (CM.Options.ToolWarnBon === 1) {
			let bonusNoFren = CM.Disp.TooltipBonusIncome;
			bonusNoFren /= CM.Cache.getCPSBuffMult();
			limitLucky += ((bonusNoFren * 60 * 15) / 0.15);
		}

		if (CM.Options.ToolWarnLucky === 1) {
			if (amount < limitLucky && (CM.Disp.tooltipType !== 'b' || Game.buyMode === 1)) {
				l('CMDispTooltipWarnLucky').style.display = '';
				l('CMDispTooltipWarnLuckyText').textContent = `${Beautify(limitLucky - amount)} (${CM.Disp.FormatTime((limitLucky - amount) / (CM.Disp.GetCPS() + CM.Disp.TooltipBonusIncome))})`;
			} else l('CMDispTooltipWarnLucky').style.display = 'none';
		} else l('CMDispTooltipWarnLucky').style.display = 'none';

		if (CM.Options.ToolWarnLuckyFrenzy === 1) {
			const limitLuckyFrenzy = limitLucky * 7;
			if (amount < limitLuckyFrenzy && (CM.Disp.tooltipType !== 'b' || Game.buyMode === 1)) {
				l('CMDispTooltipWarnLuckyFrenzy').style.display = '';
				l('CMDispTooltipWarnLuckyFrenzyText').textContent = `${Beautify(limitLuckyFrenzy - amount)} (${CM.Disp.FormatTime((limitLuckyFrenzy - amount) / (CM.Disp.GetCPS() + CM.Disp.TooltipBonusIncome))})`;
			} else l('CMDispTooltipWarnLuckyFrenzy').style.display = 'none';
		} else l('CMDispTooltipWarnLuckyFrenzy').style.display = 'none';

		if (CM.Options.ToolWarnConjure === 1) {
			const limitConjure = limitLucky * 2;
			if ((amount < limitConjure) && (CM.Disp.tooltipType !== 'b' || Game.buyMode === 1)) {
				l('CMDispTooltipWarnConjure').style.display = '';
				l('CMDispTooltipWarnConjureText').textContent = `${Beautify(limitConjure - amount)} (${CM.Disp.FormatTime((limitConjure - amount) / (CM.Disp.GetCPS() + CM.Disp.TooltipBonusIncome))})`;
			} else l('CMDispTooltipWarnConjure').style.display = 'none';
		} else l('CMDispTooltipWarnConjure').style.display = 'none';

		if (CM.Options.ToolWarnConjureFrenzy === 1) {
			const limitConjureFrenzy = limitLucky * 2 * 7;
			if ((amount < limitConjureFrenzy) && (CM.Disp.tooltipType !== 'b' || Game.buyMode === 1)) {
				l('CMDispTooltipWarnConjureFrenzy').style.display = '';
				l('CMDispTooltipWarnConjureFrenzyText').textContent = `${Beautify(limitConjureFrenzy - amount)} (${CM.Disp.FormatTime((limitConjureFrenzy - amount) / (CM.Disp.GetCPS() + CM.Disp.TooltipBonusIncome))})`;
			} else l('CMDispTooltipWarnConjureFrenzy').style.display = 'none';
		} else l('CMDispTooltipWarnConjureFrenzy').style.display = 'none';

		if (CM.Options.ToolWarnEdifice === 1) {
			if (CM.Cache.Edifice && amount < CM.Cache.Edifice && (CM.Disp.tooltipType !== 'b' || Game.buyMode === 1)) {
				l('CMDispTooltipWarnEdifice').style.display = '';
				l('CMDispTooltipWarnEdificeText').textContent = `${Beautify(CM.Cache.Edifice - amount)} (${CM.Disp.FormatTime((CM.Cache.Edifice - amount) / (CM.Disp.GetCPS() + CM.Disp.TooltipBonusIncome))})`;
			} else l('CMDispTooltipWarnEdifice').style.display = 'none';
		} else l('CMDispTooltipWarnEdifice').style.display = 'none';

		if (CM.Options.ToolWarnUser > 0) {
			if (amount < CM.Options.ToolWarnUser * CM.Disp.GetCPS() && (CM.Disp.tooltipType !== 'b' || Game.buyMode === 1)) {
				l('CMDispTooltipWarnUser').style.display = '';
				// Need to update tooltip text dynamically
				l('CMDispTooltipWarnUser').children[0].textContent = `Purchase of this item will put you under the number of Cookies equal to ${CM.Options.ToolWarnUser} seconds of CPS`;
				l('CMDispTooltipWarnUserText').textContent = `${Beautify(CM.Options.ToolWarnUser * CM.Disp.GetCPS() - amount)} (${CM.Disp.FormatTime((CM.Options.ToolWarnUser * CM.Disp.GetCPS() - amount) / (CM.Disp.GetCPS() + CM.Disp.TooltipBonusIncome))})`;
			} else l('CMDispTooltipWarnUser').style.display = 'none';
		} else l('CMDispTooltipWarnUser').style.display = 'none';
	} else if (l('CMDispTooltipWarningParent') !== null) {
		l('CMDispTooltipWarningParent').remove();
	}
};

/**
 * This function updates the location of the tooltip
 * It is called by Game.tooltip.update() because of CM.Main.ReplaceNative()
 */
CM.Disp.UpdateTooltipLocation = function () {
	if (Game.tooltip.origin === 'store') {
		let warnOffset = 0;
		if (CM.Options.ToolWarnLucky === 1 && CM.Options.ToolWarnPos === 1 && typeof CM.Disp.TooltipWarn !== 'undefined') {
			warnOffset = CM.Disp.TooltipWarn.clientHeight - 4;
		}
		Game.tooltip.tta.style.top = `${Math.min(parseInt(Game.tooltip.tta.style.top), (l('game').clientHeight + l('topBar').clientHeight) - Game.tooltip.tt.clientHeight - warnOffset - 46)}px`;
	}
	// Kept for future possible use if the code changes again
	/* else if (!Game.onCrate && !Game.OnAscend && CM.Options.TimerBar === 1 && CM.Options.TimerBarPos === 0) {
		Game.tooltip.tta.style.top = (parseInt(Game.tooltip.tta.style.top) + parseInt(CM.Disp.TimerBar.style.height)) + 'px';
	} */
};

/**
 * This function toggles the position of the warnings created by CM.Disp.TooltipCreateWarningSection()
 * It is called by a change in CM.Options.ToolWarnPos
 * and upon creation of the warning tooltip by CM.Disp.UpdateTooltipWarnings()
 */
CM.Disp.ToggleToolWarnPos = function () {
	if (typeof CM.Disp.TooltipWarn !== 'undefined') {
		if (CM.Options.ToolWarnPos === 0) {
			CM.Disp.TooltipWarn.style.top = 'auto';
			CM.Disp.TooltipWarn.style.margin = '4px -4px';
			CM.Disp.TooltipWarn.style.padding = '3px 4px';
		} else {
			CM.Disp.TooltipWarn.style.right = 'auto';
			CM.Disp.TooltipWarn.style.margin = '4px';
			CM.Disp.TooltipWarn.style.padding = '4px 3px';
		}
	}
};

/**
 * This function checks and create a tooltip for the wrinklers
 * It is called by CM.Disp.Draw()
 * As wrinklers are not appended to the DOM we us a different system than for other tooltips
 */
CM.Disp.CheckWrinklerTooltip = function () {
	if (CM.Options.TooltipWrink === 1 && CM.Disp.TooltipWrinklerArea === 1) { // Latter is set by CM.Main.AddWrinklerAreaDetect
		let showingTooltip = false;
		for (const i of Object.keys(Game.wrinklers)) {
			const me = Game.wrinklers[i];
			if (me.phase > 0 && me.selected) {
				showingTooltip = true;
				if (CM.Disp.TooltipWrinklerBeingShown[i] === 0 || CM.Disp.TooltipWrinklerBeingShown[i] === undefined) {
					const placeholder = document.createElement('div');
					const wrinkler = document.createElement('div');
					wrinkler.style.minWidth = '120px';
					wrinkler.style.marginBottom = '4px';
					const div = document.createElement('div');
					div.style.textAlign = 'center';
					div.id = 'CMTooltipWrinkler';
					wrinkler.appendChild(div);
					placeholder.appendChild(wrinkler);
					Game.tooltip.draw(this, escape(placeholder.innerHTML));
					CM.Disp.TooltipWrinkler = i;
					CM.Disp.TooltipWrinklerBeingShown[i] = 1;
				} else break;
			} else {
				CM.Disp.TooltipWrinklerBeingShown[i] = 0;
			}
		}
		if (!showingTooltip) {
			Game.tooltip.hide();
		}
	}
};

/**
 * This function updates the amount to be displayed by the wrinkler tooltip created by CM.Disp.CheckWrinklerTooltip()
 * It is called by CM.Disp.Draw()
 * As wrinklers are not appended to the DOM we us a different system than for other tooltips
 */
CM.Disp.UpdateWrinklerTooltip = function () {
	if (CM.Options.TooltipWrink === 1 && l('CMTooltipWrinkler') !== null) {
		let sucked = Game.wrinklers[CM.Disp.TooltipWrinkler].sucked;
		let toSuck = 1.1;
		if (Game.Has('Sacrilegious corruption')) toSuck *= 1.05;
		if (Game.wrinklers[CM.Disp.TooltipWrinkler].type === 1) toSuck *= 3; // Shiny wrinklers
		sucked *= toSuck;
		if (Game.Has('Wrinklerspawn')) sucked *= 1.05;
		if (CM.Sim.Objects.Temple.minigameLoaded) {
			const godLvl = Game.hasGod('scorn');
			if (godLvl === 1) sucked *= 1.15;
			else if (godLvl === 2) sucked *= 1.1;
			else if (godLvl === 3) sucked *= 1.05;
		}
		l('CMTooltipWrinkler').textContent = Beautify(sucked);
	}
};

/**
 * Section: Functions related to the Dragon */

/**
 * This functions adds the two extra lines about CPS and time to recover to the aura picker infoscreen
 * It is called by Game.DescribeDragonAura() after CM.Main.ReplaceNative()
 * @param	{number}	aura	The number of the aura currently selected by the mouse/user
 */
CM.Disp.AddAuraInfo = function (aura) {
	if (CM.Options.DragonAuraInfo === 1) {
		const [bonusCPS, priceOfChange] = CM.Sim.CalculateChangeAura(aura);
		const timeToRecover = CM.Disp.FormatTime(priceOfChange / (bonusCPS + Game.cookiesPs));
		const bonusCPSPercentage = CM.Disp.Beautify(bonusCPS / Game.cookiesPs);

		l('dragonAuraInfo').style.minHeight = '60px';
		l('dragonAuraInfo').style.margin = '8px';
		l('dragonAuraInfo').appendChild(document.createElement('div')).className = 'line';
		const div = document.createElement('div');
		div.style.minWidth = '200px';
		div.style.textAlign = 'center';
		div.textContent = `Picking this aura will change CPS by ${CM.Disp.Beautify(bonusCPS)} (${bonusCPSPercentage}% of current CPS).`;
		l('dragonAuraInfo').appendChild(div);
		const div2 = document.createElement('div');
		div2.style.minWidth = '200px';
		div2.style.textAlign = 'center';
		div2.textContent = `It will take ${timeToRecover} to recover the cost.`;
		l('dragonAuraInfo').appendChild(div2);
	}
};

/**
 * This functions adds a tooltip to the level up button displaying the cost of rebuying all
 * It is called by Game.ToggleSpecialMenu() after CM.Main.ReplaceNative()
 */
CM.Disp.AddDragonLevelUpTooltip = function () {
	// Check if it is the dragon popup that is on screen
	if ((l('specialPopup').className.match(/onScreen/) && l('specialPopup').children[0].style.background.match(/dragon/)) !== null) {
		for (let i = 0; i < l('specialPopup').childNodes.length; i++) {
			if (l('specialPopup').childNodes[i].className === 'optionBox') {
				l('specialPopup').children[i].onmouseover = function () { CM.Cache.CacheDragonCost(); Game.tooltip.dynamic = 1; Game.tooltip.draw(l('specialPopup'), `<div style="min-width:200px;text-align:center;">${CM.Cache.CostDragonUpgrade}</div>`, 'this'); Game.tooltip.wobble(); };
				l('specialPopup').children[i].onmouseout = function () { Game.tooltip.shouldHide = 1; };
			}
		}
	}
};

/**
 * Section: General functions related to the Options/Stats pages

/**
 * This function adds the calll the functions to add extra info to the stats and options pages
 * It is called by Game.UpdateMenu()
 */
CM.Disp.AddMenu = function () {
	const title = document.createElement('div');
	title.className = 'title';

	if (Game.onMenu === 'prefs') {
		title.textContent = 'Cookie Monster Settings';
		CM.Disp.AddMenuPref(title);
	} else if (Game.onMenu === 'stats') {
		if (CM.Options.Stats) {
			title.textContent = 'Cookie Monster Statistics';
			CM.Disp.AddMenuStats(title);
		}
	} else if (Game.onMenu === 'log') {
		title.textContent = 'Cookie Monster '; // To create space between name and button
		CM.Disp.AddMenuInfo(title);
	}
};

/**
 * This function refreshes the stats page, CM.Options.UpStats determines the rate at which that happens
 * It is called by CM.Disp.Draw()
 */
CM.Disp.RefreshMenu = function () {
	if (CM.Options.UpStats && Game.onMenu === 'stats' && (Game.drawT - 1) % (Game.fps * 5) !== 0 && (Game.drawT - 1) % Game.fps === 0) Game.UpdateMenu();
};

/**
 * Section: Functions related to the Options/Preferences page

/**
 * This function adds the options/settings of CookieMonster to the options page
 * It is called by CM.Disp.AddMenu
 * @param {object} title	On object that includes the title of the menu
 */
CM.Disp.AddMenuPref = function (title) {
	const frag = document.createDocumentFragment();
	frag.appendChild(title);

	for (const group of Object.keys(CM.Data.ConfigGroups)) {
		const groupObject = CM.Disp.CreatePrefHeader(group, CM.Data.ConfigGroups[group]); // (group, display-name of group)
		frag.appendChild(groupObject);
		if (CM.Options.Header[group]) { // 0 is show, 1 is collapsed
			// Make sub-sections of Notification section
			if (group === 'Notification') {
				for (const subGroup of Object.keys(CM.Data.ConfigGroupsNotification)) {
					const subGroupObject = CM.Disp.CreatePrefHeader(subGroup, CM.Data.ConfigGroupsNotification[subGroup]); // (group, display-name of group)
					subGroupObject.style.fontSize = '15px';
					subGroupObject.style.opacity = '0.5';
					frag.appendChild(subGroupObject);
					if (CM.Options.Header[subGroup]) {
						for (const option in CM.Data.Config) {
							if (CM.Data.Config[option].group === subGroup) frag.appendChild(CM.Disp.CreatePrefOption(option));
						}
					}
				}
			} else {
				for (const option of Object.keys(CM.Data.Config)) {
					if (CM.Data.Config[option].group === group) frag.appendChild(CM.Disp.CreatePrefOption(option));
				}
			}
		}
	}

	const resDef = document.createElement('div');
	resDef.className = 'listing';
	const resDefBut = document.createElement('a');
	resDefBut.className = 'option';
	resDefBut.onclick = function () { CM.Config.RestoreDefault(); };
	resDefBut.textContent = 'Restore Default';
	resDef.appendChild(resDefBut);
	frag.appendChild(resDef);

	l('menu').childNodes[2].insertBefore(frag, l('menu').childNodes[2].childNodes[l('menu').childNodes[2].childNodes.length - 1]);
};

/**
 * This function creates a header-object for the options page
 * It is called by CM.Disp.AddMenuPref()
 * @param 	{string}		config	The name of the Config-group
 * @param 	{string}		text	The to-be displayed name of the header
 * @returns	{object}		div		The header object
 */
CM.Disp.CreatePrefHeader = function (config, text) {
	const div = document.createElement('div');
	div.className = 'title';

	div.style.opacity = '0.7';
	div.style.fontSize = '17px';
	div.appendChild(document.createTextNode(`${text} `));
	const span = document.createElement('span'); // Creates the +/- button
	span.style.cursor = 'pointer';
	span.style.display = 'inline-block';
	span.style.height = '14px';
	span.style.width = '14px';
	span.style.borderRadius = '7px';
	span.style.textAlign = 'center';
	span.style.backgroundColor = '#C0C0C0';
	span.style.color = 'black';
	span.style.fontSize = '13px';
	span.style.verticalAlign = 'middle';
	span.textContent = CM.Options.Header[config] ? '-' : '+';
	span.onclick = function () { CM.Config.ToggleHeader(config); Game.UpdateMenu(); };
	div.appendChild(span);
	return div;
};

/**
 * This function creates an option-object for the options page
 * It is called by CM.Disp.AddMenuPref()
 * @param 	{string}		config	The name of the option
 * @returns	{object}		div		The option object
 */
CM.Disp.CreatePrefOption = function (config) {
	const div = document.createElement('div');
	div.className = 'listing';
	if (CM.Data.Config[config].type === 'bool') {
		const a = document.createElement('a');
		if (CM.Data.Config[config].toggle && CM.Options[config] === 0) {
			a.className = 'option off';
		} else {
			a.className = 'option';
		}
		a.id = CM.Config.ConfigPrefix + config;
		a.onclick = function () { CM.Config.ToggleConfig(config); };
		a.textContent = CM.Data.Config[config].label[CM.Options[config]];
		div.appendChild(a);
		const label = document.createElement('label');
		label.textContent = CM.Data.Config[config].desc;
		div.appendChild(label);
		return div;
	} else if (CM.Data.Config[config].type === 'vol') {
		const volume = document.createElement('div');
		volume.className = 'sliderBox';
		const title = document.createElement('div');
		title.style.float = 'left';
		title.innerHTML = CM.Data.Config[config].desc;
		volume.appendChild(title);
		const percent = document.createElement('div');
		percent.id = `slider${config}right`;
		percent.style.float = 'right';
		percent.innerHTML = `${CM.Options[config]}%`;
		volume.appendChild(percent);
		const slider = document.createElement('input');
		slider.className = 'slider';
		slider.id = `slider${config}`;
		slider.style.clear = 'both';
		slider.type = 'range';
		slider.min = '0';
		slider.max = '100';
		slider.step = '1';
		slider.value = CM.Options[config];
		slider.oninput = function () { CM.Config.ToggleConfigVolume(config); };
		slider.onchange = function () { CM.Config.ToggleConfigVolume(config); };
		volume.appendChild(slider);
		div.appendChild(volume);
		return div;
	} else if (CM.Data.Config[config].type === 'url') {
		const span = document.createElement('span');
		span.className = 'option';
		span.textContent = `${CM.Data.Config[config].label} `;
		div.appendChild(span);
		const input = document.createElement('input');
		input.id = CM.Config.ConfigPrefix + config;
		input.className = 'option';
		input.type = 'text';
		input.readOnly = true;
		input.setAttribute('value', CM.Options[config]);
		input.style.width = '300px';
		div.appendChild(input);
		div.appendChild(document.createTextNode(' '));
		const inputPrompt = document.createElement('input');
		inputPrompt.id = `${CM.Config.ConfigPrefix + config}Prompt`;
		inputPrompt.className = 'option';
		inputPrompt.type = 'text';
		inputPrompt.setAttribute('value', CM.Options[config]);
		const a = document.createElement('a');
		a.className = 'option';
		a.onclick = function () { Game.Prompt(inputPrompt.outerHTML, [['Save', `CM.Options['${config}'] = l(CM.Config.ConfigPrefix + '${config}' + 'Prompt').value; CM.Config.SaveConfig(); Game.ClosePrompt(); Game.UpdateMenu();`], 'Cancel']); };
		a.textContent = 'Edit';
		div.appendChild(a);
		const label = document.createElement('label');
		label.textContent = CM.Data.Config[config].desc;
		div.appendChild(label);
		return div;
	} else if (CM.Data.Config[config].type === 'color') {
		div.className = '';
		for (let i = 0; i < CM.Disp.colors.length; i++) {
			const innerDiv = document.createElement('div');
			innerDiv.className = 'listing';
			const input = document.createElement('input');
			input.id = CM.Disp.colors[i];
			input.style.width = '65px';
			input.setAttribute('value', CM.Options.Colors[CM.Disp.colors[i]]);
			innerDiv.appendChild(input);
			const change = function () { CM.Options.Colors[this.targetElement.id] = this.toHEXString(); CM.Disp.UpdateColors(); CM.Config.SaveConfig(); Game.UpdateMenu(); };
			new JSColor(input, { hash: true, position: 'right', onInput: change });
			const label = document.createElement('label');
			label.textContent = CM.Data.Config.Colors.desc[CM.Disp.colors[i]];
			innerDiv.appendChild(label);
			div.appendChild(innerDiv);
		}
		return div;
	} else if (CM.Data.Config[config].type === 'numscale') {
		const span = document.createElement('span');
		span.className = 'option';
		span.textContent = `${CM.Data.Config[config].label} `;
		div.appendChild(span);
		const input = document.createElement('input');
		input.id = CM.Config.ConfigPrefix + config;
		input.className = 'option';
		input.type = 'number';
		input.value = (CM.Options[config]);
		input.min = CM.Data.Config[config].min;
		input.max = CM.Data.Config[config].max;
		input.oninput = function () {
			if (this.value > this.max) console.log('TEST');
			CM.Options[config] = this.value;
			CM.Config.SaveConfig();
			CM.Disp.RefreshScale();
		};
		div.appendChild(input);
		div.appendChild(document.createTextNode(' '));
		const label = document.createElement('label');
		label.textContent = CM.Data.Config[config].desc;
		div.appendChild(label);
		return div;
	}
	return div;
};

/**
 * This function changes some of the time-displays in the game to be more detailed
 * It is called by a change in CM.Options.DetailedTime
 */
CM.Disp.ToggleDetailedTime = function () {
	if (CM.Options.DetailedTime === 1) Game.sayTime = CM.Disp.sayTime;
	else Game.sayTime = CM.Backup.sayTime;
};

/**
 * This function refreshes all numbers after a change in scale-setting
 * It is therefore called by a changes in CM.Options.Scale, CM.Options.ScaleDecimals, CM.Options.ScaleSeparator and CM.Options.ScaleCutoff
 */
CM.Disp.RefreshScale = function () {
	BeautifyAll();
	Game.RefreshStore();
	Game.RebuildUpgrades();

	CM.Disp.UpdateBotBar();
	CM.Disp.UpdateBuildings();
	CM.Disp.UpdateUpgrades();
};

/**
 * This function changes/refreshes colours if the user has set new standard colours
 * The function is therefore called by a change in CM.Options.Colors
 */
CM.Disp.UpdateColors = function () {
	let str = '';
	for (let i = 0; i < CM.Disp.colors.length; i++) {
		str += `.${CM.Disp.colorTextPre}${CM.Disp.colors[i]} { color: ${CM.Options.Colors[CM.Disp.colors[i]]}; }\n`;
	}
	for (let i = 0; i < CM.Disp.colors.length; i++) {
		str += `.${CM.Disp.colorBackPre}${CM.Disp.colors[i]} { background-color: ${CM.Options.Colors[CM.Disp.colors[i]]}; }\n`;
	}
	for (let i = 0; i < CM.Disp.colors.length; i++) {
		str += `.${CM.Disp.colorBorderPre}${CM.Disp.colors[i]} { border: 1px solid ${CM.Options.Colors[CM.Disp.colors[i]]}; }\n`;
	}
	CM.Disp.Css.textContent = str;
	CM.Disp.UpdateBuildings(); // Class has been already set
};

/**
 * Section: Functions related to the Stats page

/**
 * This function adds stats created by CookieMonster to the stats page
 * It is called by CM.Disp.AddMenu
 * @param {object} title	On object that includes the title of the menu
 */
CM.Disp.AddMenuStats = function (title) {
	const stats = document.createElement('div');
	stats.className = 'subsection';
	stats.appendChild(title);

	stats.appendChild(CM.Disp.CreateStatsHeader('Lucky Cookies', 'Lucky'));
	if (CM.Options.Header.Lucky) {
		stats.appendChild(CM.Disp.CreateStatsLuckySection());
	}

	stats.appendChild(CM.Disp.CreateStatsHeader('Chain Cookies', 'Chain'));
	if (CM.Options.Header.Chain) {
		stats.appendChild(CM.Disp.CreateStatsChainSection());
	}

	if (Game.Objects['Wizard tower'].minigameLoaded) {
		stats.appendChild(CM.Disp.CreateStatsHeader('Spells', 'Spells'));
		if (CM.Options.Header.Spells) {
			stats.appendChild(CM.Disp.CreateStatsSpellsSection());
		}
	}

	if (Game.Objects.Farm.minigameLoaded) {
		stats.appendChild(CM.Disp.CreateStatsHeader('Garden', 'Garden'));
		if (CM.Options.Header.Garden) {
			stats.appendChild(CM.Disp.CreateStatsGardenSection());
		}
	}

	stats.appendChild(CM.Disp.CreateStatsHeader('Prestige', 'Prestige'));
	if (CM.Options.Header.Prestige) {
		stats.appendChild(CM.Disp.CreateStatsPrestigeSection());
	}

	if (Game.cpsSucked > 0) {
		stats.appendChild(CM.Disp.CreateStatsHeader('Wrinklers', 'Wrink'));
		if (CM.Options.Header.Wrink) {
			const popAllFrag = document.createDocumentFragment();
			popAllFrag.appendChild(document.createTextNode(`${Beautify(CM.Cache.WrinklersTotal)} / ${Beautify(CM.Cache.WrinklersNormal)} `));
			const popAllA = document.createElement('a');
			popAllA.textContent = 'Pop All Normal';
			popAllA.className = 'option';
			popAllA.onclick = function () { CM.Disp.PopAllNormalWrinklers(); };
			popAllFrag.appendChild(popAllA);
			stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Rewards of Popping (All/Normal)', popAllFrag));
			const popFattestFrag = document.createDocumentFragment();
			popFattestFrag.appendChild(document.createTextNode(`${Beautify(CM.Cache.WrinklersFattest[0])} `));
			const popFattestA = document.createElement('a');
			popFattestA.textContent = 'Pop Single Fattest';
			popFattestA.className = 'option';
			popFattestA.onclick = function () { if (CM.Cache.WrinklersFattest[1]) Game.wrinklers[CM.Cache.WrinklersFattest[1]].hp = 0; };
			popFattestFrag.appendChild(popFattestA);
			stats.appendChild(CM.Disp.CreateStatsListing('basic', `Rewards of Popping Single Fattest Non-Shiny Wrinkler (id: ${CM.Cache.WrinklersFattest[1] !== null ? CM.Cache.WrinklersFattest[1] : 'None'})`, popFattestFrag));
		}
	}

	let specDisp = false;
	const missingHalloweenCookies = [];
	for (const i of Object.keys(CM.Data.HalloCookies)) {
		if (!Game.Has(CM.Data.HalloCookies[i])) {
			missingHalloweenCookies.push(CM.Data.HalloCookies[i]);
			specDisp = true;
		}
	}
	const missingChristmasCookies = [];
	for (const i of Object.keys(CM.Data.ChristCookies)) {
		if (!Game.Has(CM.Data.ChristCookies[i])) {
			missingChristmasCookies.push(CM.Data.ChristCookies[i]);
			specDisp = true;
		}
	}
	const missingValentineCookies = [];
	for (const i of Object.keys(CM.Data.ValCookies)) {
		if (!Game.Has(CM.Data.ValCookies[i])) {
			missingValentineCookies.push(CM.Data.ValCookies[i]);
			specDisp = true;
		}
	}
	const missingNormalEggs = [];
	for (const i of Object.keys(Game.eggDrops)) {
		if (!Game.HasUnlocked(Game.eggDrops[i])) {
			missingNormalEggs.push(Game.eggDrops[i]);
			specDisp = true;
		}
	}
	const missingRareEggs = [];
	for (const i of Object.keys(Game.rareEggDrops)) {
		if (!Game.HasUnlocked(Game.rareEggDrops[i])) {
			missingRareEggs.push(Game.rareEggDrops[i]);
			specDisp = true;
		}
	}
	const missingPlantDrops = [];
	for (const i of Object.keys(CM.Data.PlantDrops)) {
		if (!Game.HasUnlocked(CM.Data.PlantDrops[i])) {
			missingPlantDrops.push(CM.Data.PlantDrops[i]);
			specDisp = true;
		}
	}
	const choEgg = (Game.HasUnlocked('Chocolate egg') && !Game.Has('Chocolate egg'));
	const centEgg = Game.Has('Century egg');

	if (Game.season === 'christmas' || specDisp || choEgg || centEgg) {
		stats.appendChild(CM.Disp.CreateStatsHeader('Season Specials', 'Sea'));
		if (CM.Options.Header.Sea) {
			if (missingHalloweenCookies.length !== 0) stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Halloween Cookies Left to Buy', CM.Disp.CreateStatsMissDisp(missingHalloweenCookies)));
			if (missingChristmasCookies.length !== 0) stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Christmas Cookies Left to Buy', CM.Disp.CreateStatsMissDisp(missingChristmasCookies)));
			if (missingValentineCookies.length !== 0) stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Valentine Cookies Left to Buy', CM.Disp.CreateStatsMissDisp(missingValentineCookies)));
			if (missingNormalEggs.length !== 0) stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Normal Easter Eggs Left to Unlock', CM.Disp.CreateStatsMissDisp(missingNormalEggs)));
			if (missingRareEggs.length !== 0) stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Rare Easter Eggs Left to Unlock', CM.Disp.CreateStatsMissDisp(missingRareEggs)));
			if (missingPlantDrops.length !== 0) stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Rare Plant Drops Left to Unlock', CM.Disp.CreateStatsMissDisp(missingPlantDrops)));

			if (Game.season === 'christmas') stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Reindeer Reward', document.createTextNode(Beautify(CM.Cache.SeaSpec))));
			if (choEgg) {
				stats.appendChild(CM.Disp.CreateStatsListing('withTooltip', 'Chocolate Egg Cookies', document.createTextNode(Beautify(CM.Cache.lastChoEgg)), 'ChoEggTooltipPlaceholder'));
			}
			if (centEgg) {
				stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Century Egg Multiplier', document.createTextNode(`${Math.round((CM.Cache.CentEgg - 1) * 10000) / 100}%`)));
			}
		}
	}

	stats.appendChild(CM.Disp.CreateStatsHeader('Miscellaneous', 'Misc'));
	if (CM.Options.Header.Misc) {
		stats.appendChild(CM.Disp.CreateStatsListing('basic',
			`Average Cookies Per Second (Past ${CM.Disp.cookieTimes[CM.Options.AvgCPSHist] < 60 ? (`${CM.Disp.cookieTimes[CM.Options.AvgCPSHist]} seconds`) : ((CM.Disp.cookieTimes[CM.Options.AvgCPSHist] / 60) + (CM.Options.AvgCPSHist === 3 ? ' minute' : ' minutes'))})`,
			document.createTextNode(Beautify(CM.Disp.GetCPS(), 3))));
		stats.appendChild(CM.Disp.CreateStatsListing('basic', `Average Cookie Clicks Per Second (Past ${CM.Disp.clickTimes[CM.Options.AvgClicksHist]}${CM.Options.AvgClicksHist === 0 ? ' second' : ' seconds'})`, document.createTextNode(Beautify(CM.Cache.AverageClicks, 1))));
		if (Game.Has('Fortune cookies')) {
			const fortunes = [];
			for (const i of Object.keys(CM.Data.Fortunes)) {
				if (!Game.Has(CM.Data.Fortunes[i])) {
					fortunes.push(CM.Data.Fortunes[i]);
				}
			}
			if (fortunes.length !== 0) stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Fortune Upgrades Left to Buy', CM.Disp.CreateStatsMissDisp(fortunes)));
		}
		if (CM.Options.ShowMissedGC) {
			stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Missed Golden Cookies', document.createTextNode(Beautify(Game.missedGoldenClicks))));
		}
		if (Game.prefs.autosave) {
			const timer = document.createElement('span');
			timer.id = 'CMStatsAutosaveTimer';
			timer.innerText = Game.sayTime(Game.fps * 60 - (Game.OnAscend ? 0 : (Game.T % (Game.fps * 60))), 4);
			stats.appendChild(CM.Disp.CreateStatsListing('basic', 'Time till autosave', timer));
		}
	}

	l('menu').insertBefore(stats, l('menu').childNodes[2]);

	if (CM.Options.MissingUpgrades) {
		CM.Disp.AddMissingUpgrades();
	}
};

/**
 * This function creates a header-object for the stats page
 * It is called by CM.Disp.AddMenuStats()
 * @param 	{string}		config	The name of the Config-group
 * @param 	{string}		text	The to-be displayed name of the header
 * @returns	{object}		div		The header object
 */
CM.Disp.CreateStatsHeader = function (text, config) {
	const div = document.createElement('div');
	div.className = 'title';
	div.style.padding = '0px 16px';
	div.style.opacity = '0.7';
	div.style.fontSize = '17px';
	div.style.fontFamily = '"Kavoon", Georgia, serif';
	div.appendChild(document.createTextNode(`${text} `));
	const span = document.createElement('span');
	span.style.cursor = 'pointer';
	span.style.display = 'inline-block';
	span.style.height = '14px';
	span.style.width = '14px';
	span.style.borderRadius = '7px';
	span.style.textAlign = 'center';
	span.style.backgroundColor = '#C0C0C0';
	span.style.color = 'black';
	span.style.fontSize = '13px';
	span.style.verticalAlign = 'middle';
	span.textContent = CM.Options.Header[config] ? '-' : '+';
	span.onclick = function () { CM.Config.ToggleHeader(config); Game.UpdateMenu(); };
	div.appendChild(span);
	return div;
};

/**
 * This function creates an stats-listing-object for the stats page
 * It is called by CM.Disp.AddMenuStats()
 * @param 	{string}		type		The type fo the listing
 * @param 	{string}		name		The name of the option
 * @param 	{object}		text		The text-object of the option
 * @param 	{string}		placeholder	The id of the to-be displayed tooltip if applicable
 * @returns	{object}		div			The option object
 */
CM.Disp.CreateStatsListing = function (type, name, text, placeholder) {
	const div = document.createElement('div');
	div.className = 'listing';

	const listingName = document.createElement('b');
	listingName.textContent = name;
	div.appendChild(listingName);
	if (type === 'withTooltip') {
		div.className = 'listing';
		div.appendChild(document.createTextNode(' '));

		const tooltip = document.createElement('span');
		tooltip.onmouseout = function () { Game.tooltip.hide(); };
		tooltip.onmouseover = function () { Game.tooltip.draw(this, escape(CM.Disp[placeholder].innerHTML)); };
		tooltip.style.cursor = 'default';
		tooltip.style.display = 'inline-block';
		tooltip.style.height = '10px';
		tooltip.style.width = '10px';
		tooltip.style.borderRadius = '5px';
		tooltip.style.textAlign = 'center';
		tooltip.style.backgroundColor = '#C0C0C0';
		tooltip.style.color = 'black';
		tooltip.style.fontSize = '9px';
		tooltip.style.verticalAlign = 'bottom';
		tooltip.textContent = '?';
		div.appendChild(tooltip);
	}
	div.appendChild(document.createTextNode(': '));
	div.appendChild(text);
	return div;
};

/**
 * This function creates a tooltip containing all missing holiday items contained in the list theMissDisp
 * @param 	{list}			theMissDisp		A list of the missing holiday items
 * @returns	{object}		frag			The tooltip object
 */
CM.Disp.CreateStatsMissDisp = function (theMissDisp) {
	const frag = document.createDocumentFragment();
	frag.appendChild(document.createTextNode(`${theMissDisp.length} `));
	const span = document.createElement('span');
	span.onmouseout = function () { Game.tooltip.hide(); };
	const placeholder = document.createElement('div');
	const missing = document.createElement('div');
	missing.style.minWidth = '140px';
	missing.style.marginBottom = '4px';
	const title = document.createElement('div');
	title.className = 'name';
	title.style.marginBottom = '4px';
	title.style.textAlign = 'center';
	title.textContent = 'Missing';
	missing.appendChild(title);
	for (const i of Object.keys(theMissDisp)) {
		const div = document.createElement('div');
		div.style.textAlign = 'center';
		div.appendChild(document.createTextNode(theMissDisp[i]));
		missing.appendChild(div);
	}
	placeholder.appendChild(missing);
	span.onmouseover = function () { Game.tooltip.draw(this, escape(placeholder.innerHTML)); };
	span.style.cursor = 'default';
	span.style.display = 'inline-block';
	span.style.height = '10px';
	span.style.width = '10px';
	span.style.borderRadius = '5px';
	span.style.textAlign = 'center';
	span.style.backgroundColor = '#C0C0C0';
	span.style.color = 'black';
	span.style.fontSize = '9px';
	span.style.verticalAlign = 'bottom';
	span.textContent = '?';
	frag.appendChild(span);
	return frag;
};

/**
 * This function creates the "Lucky" section of the stats page
 * @returns	{object}	section		The object contating the Lucky section
 */
CM.Disp.CreateStatsLuckySection = function () {
	// This sets which tooltip to display for certain stats
	const goldCookTooltip = Game.auraMult('Dragon\'s Fortune') ? 'GoldCookDragonsFortuneTooltipPlaceholder' : 'GoldCookTooltipPlaceholder';

	const section = document.createElement('div');
	section.className = 'CMStatsLuckySection';

	const luckyColor = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.Lucky) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const luckyTime = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.Lucky) ? CM.Disp.FormatTime((CM.Cache.Lucky - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS()) : '';
	const luckyReqFrag = document.createDocumentFragment();
	const luckyReqSpan = document.createElement('span');
	luckyReqSpan.style.fontWeight = 'bold';
	luckyReqSpan.className = CM.Disp.colorTextPre + luckyColor;
	luckyReqSpan.textContent = Beautify(CM.Cache.Lucky);
	luckyReqFrag.appendChild(luckyReqSpan);
	if (luckyTime !== '') {
		const luckyReqSmall = document.createElement('small');
		luckyReqSmall.textContent = ` (${luckyTime})`;
		luckyReqFrag.appendChild(luckyReqSmall);
	}
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Lucky!" Cookies Required', luckyReqFrag, goldCookTooltip));

	const luckyColorFrenzy = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.LuckyFrenzy) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const luckyTimeFrenzy = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.LuckyFrenzy) ? CM.Disp.FormatTime((CM.Cache.LuckyFrenzy - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS()) : '';
	const luckyReqFrenFrag = document.createDocumentFragment();
	const luckyReqFrenSpan = document.createElement('span');
	luckyReqFrenSpan.style.fontWeight = 'bold';
	luckyReqFrenSpan.className = CM.Disp.colorTextPre + luckyColorFrenzy;
	luckyReqFrenSpan.textContent = Beautify(CM.Cache.LuckyFrenzy);
	luckyReqFrenFrag.appendChild(luckyReqFrenSpan);
	if (luckyTimeFrenzy !== '') {
		const luckyReqFrenSmall = document.createElement('small');
		luckyReqFrenSmall.textContent = ` (${luckyTimeFrenzy})`;
		luckyReqFrenFrag.appendChild(luckyReqFrenSmall);
	}
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Lucky!" Cookies Required (Frenzy)', luckyReqFrenFrag, goldCookTooltip));

	const luckySplit = CM.Cache.LuckyReward !== CM.Cache.LuckyWrathReward;

	const luckyRewardMaxSpan = document.createElement('span');
	luckyRewardMaxSpan.style.fontWeight = 'bold';
	luckyRewardMaxSpan.className = CM.Disp.colorTextPre + CM.Cache.LuckyReward;
	luckyRewardMaxSpan.textContent = Beautify(CM.Cache.LuckyReward) + (luckySplit ? (` / ${Beautify(CM.Cache.LuckyWrathReward)}`) : '');
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', `"Lucky!" Reward (MAX)${luckySplit ? ' (Golden / Wrath)' : ''}`, luckyRewardMaxSpan, goldCookTooltip));

	const luckyRewardFrenzyMaxSpan = document.createElement('span');
	luckyRewardFrenzyMaxSpan.style.fontWeight = 'bold';
	luckyRewardFrenzyMaxSpan.className = CM.Disp.colorTextPre + luckyRewardFrenzyMaxSpan;
	luckyRewardFrenzyMaxSpan.textContent = Beautify(CM.Cache.LuckyRewardFrenzy) + (luckySplit ? (` / ${Beautify(CM.Cache.LuckyWrathRewardFrenzy)}`) : '');
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', `"Lucky!" Reward (MAX) (Frenzy)${luckySplit ? ' (Golden / Wrath)' : ''}`, luckyRewardFrenzyMaxSpan, goldCookTooltip));

	const luckyCurBase = Math.min((Game.cookies + CM.Disp.GetWrinkConfigBank()) * 0.15, CM.Cache.NoGoldSwitchCookiesPS * CM.Cache.DragonsFortuneMultAdjustment * 60 * 15) + 13;
	const luckyCurSpan = document.createElement('span');
	luckyCurSpan.style.fontWeight = 'bold';
	luckyCurSpan.className = CM.Disp.colorTextPre + luckyCurSpan;
	luckyCurSpan.textContent = Beautify(CM.Cache.GoldenCookiesMult * luckyCurBase) + (luckySplit ? (` / ${Beautify(CM.Cache.WrathCookiesMult * luckyCurBase)}`) : '');
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', `"Lucky!" Reward (CUR)${luckySplit ? ' (Golden / Wrath)' : ''}`, luckyCurSpan, goldCookTooltip));
	return section;
};

/**
 * This function creates the "Chain" section of the stats page
 * @returns	{object}	section		The object contating the Chain section
 */
CM.Disp.CreateStatsChainSection = function () {
	// This sets which tooltip to display for certain stats
	const goldCookTooltip = Game.auraMult('Dragon\'s Fortune') ? 'GoldCookDragonsFortuneTooltipPlaceholder' : 'GoldCookTooltipPlaceholder';

	const section = document.createElement('div');
	section.className = 'CMStatsChainSection';

	const chainColor = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.ChainRequired) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const chainTime = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.ChainRequired) ? CM.Disp.FormatTime((CM.Cache.ChainRequired - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS()) : '';
	const chainReqFrag = document.createDocumentFragment();
	const chainReqSpan = document.createElement('span');
	chainReqSpan.style.fontWeight = 'bold';
	chainReqSpan.className = CM.Disp.colorTextPre + chainColor;
	chainReqSpan.textContent = Beautify(CM.Cache.ChainRequired);
	chainReqFrag.appendChild(chainReqSpan);
	if (chainTime !== '') {
		const chainReqSmall = document.createElement('small');
		chainReqSmall.textContent = ` (${chainTime})`;
		chainReqFrag.appendChild(chainReqSmall);
	}
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Chain" Cookies Required', chainReqFrag, goldCookTooltip));

	const chainWrathColor = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.ChainWrathRequired) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const chainWrathTime = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.ChainWrathRequired) ? CM.Disp.FormatTime((CM.Cache.ChainWrathRequired - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS()) : '';
	const chainWrathReqFrag = document.createDocumentFragment();
	const chainWrathReqSpan = document.createElement('span');
	chainWrathReqSpan.style.fontWeight = 'bold';
	chainWrathReqSpan.className = CM.Disp.colorTextPre + chainWrathColor;
	chainWrathReqSpan.textContent = Beautify(CM.Cache.ChainWrathRequired);
	chainWrathReqFrag.appendChild(chainWrathReqSpan);
	if (chainWrathTime !== '') {
		const chainWrathReqSmall = document.createElement('small');
		chainWrathReqSmall.textContent = ` (${chainWrathTime})`;
		chainWrathReqFrag.appendChild(chainWrathReqSmall);
	}
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Chain" Cookies Required (Wrath)', chainWrathReqFrag, goldCookTooltip));

	const chainColorFrenzy = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.ChainFrenzyRequired) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const chainTimeFrenzy = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.ChainFrenzyRequired) ? CM.Disp.FormatTime((CM.Cache.ChainFrenzyRequired - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS()) : '';
	const chainReqFrenFrag = document.createDocumentFragment();
	const chainReqFrenSpan = document.createElement('span');
	chainReqFrenSpan.style.fontWeight = 'bold';
	chainReqFrenSpan.className = CM.Disp.colorTextPre + chainColorFrenzy;
	chainReqFrenSpan.textContent = Beautify(CM.Cache.ChainFrenzyRequired);
	chainReqFrenFrag.appendChild(chainReqFrenSpan);
	if (chainTimeFrenzy !== '') {
		const chainReqFrenSmall = document.createElement('small');
		chainReqFrenSmall.textContent = ` (${chainTimeFrenzy})`;
		chainReqFrenFrag.appendChild(chainReqFrenSmall);
	}
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Chain" Cookies Required (Frenzy)', chainReqFrenFrag, goldCookTooltip));

	const chainWrathColorFrenzy = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.ChainFrenzyWrathRequired) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const chainWrathTimeFrenzy = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.ChainFrenzyWrathRequired) ? CM.Disp.FormatTime((CM.Cache.ChainFrenzyWrathRequired - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS()) : '';
	const chainWrathReqFrenFrag = document.createDocumentFragment();
	const chainWrathReqFrenSpan = document.createElement('span');
	chainWrathReqFrenSpan.style.fontWeight = 'bold';
	chainWrathReqFrenSpan.className = CM.Disp.colorTextPre + chainWrathColorFrenzy;
	chainWrathReqFrenSpan.textContent = Beautify(CM.Cache.ChainFrenzyWrathRequired);
	chainWrathReqFrenFrag.appendChild(chainWrathReqFrenSpan);
	if (chainWrathTimeFrenzy !== '') {
		const chainWrathReqFrenSmall = document.createElement('small');
		chainWrathReqFrenSmall.textContent = ` (${chainWrathTimeFrenzy})`;
		chainWrathReqFrenFrag.appendChild(chainWrathReqFrenSmall);
	}
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Chain" Cookies Required (Frenzy) (Wrath)', chainWrathReqFrenFrag, goldCookTooltip));

	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Chain" Reward (MAX) (Golden / Wrath)', document.createTextNode(`${Beautify(CM.Cache.ChainMaxReward[0])} / ${Beautify(CM.Cache.ChainMaxWrathReward[0])}`), goldCookTooltip));

	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Chain" Reward (MAX) (Frenzy) (Golden / Wrath)', document.createTextNode((`${Beautify(CM.Cache.ChainFrenzyMaxReward[0])} / ${Beautify(CM.Cache.ChainFrenzyMaxWrathReward[0])}`)), goldCookTooltip));

	const chainCurMax = Math.min(Game.cookiesPs * 60 * 60 * 6 * CM.Cache.DragonsFortuneMultAdjustment, Game.cookies * 0.5);
	const chainCur = CM.Cache.MaxChainCookieReward(7, chainCurMax, CM.Cache.GoldenCookiesMult)[0];
	const chainCurWrath = CM.Cache.MaxChainCookieReward(6, chainCurMax, CM.Cache.WrathCookiesMult)[0];
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Chain" Reward (CUR) (Golden / Wrath)', document.createTextNode((`${Beautify(chainCur)} / ${Beautify(chainCurWrath)}`)), goldCookTooltip));

	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', 'CPS Needed For Next Level (G / W)', document.createTextNode((`${Beautify(CM.Cache.ChainRequiredNext)} / ${Beautify(CM.Cache.ChainWrathRequiredNext)}`)), 'ChainNextLevelPlaceholder'));
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', 'CPS Needed For Next Level (Frenzy) (G / W)', document.createTextNode((`${Beautify(CM.Cache.ChainFrenzyRequiredNext)} / ${Beautify(CM.Cache.ChainFrenzyWrathRequiredNext)}`)), 'ChainNextLevelPlaceholder'));
	return section;
};

/**
 * This function creates the "Spells" section of the stats page
 * @returns	{object}	section		The object contating the Spells section
 */
CM.Disp.CreateStatsSpellsSection = function () {
	const section = document.createElement('div');
	section.className = 'CMStatsSpellsSection';

	const conjureColor = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.Conjure) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const conjureTime = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.Conjure) ? CM.Disp.FormatTime((CM.Cache.Conjure - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS()) : '';

	const conjureReqFrag = document.createDocumentFragment();
	const conjureReqSpan = document.createElement('span');
	conjureReqSpan.style.fontWeight = 'bold';
	conjureReqSpan.className = CM.Disp.colorTextPre + conjureColor;
	conjureReqSpan.textContent = Beautify(CM.Cache.Conjure);
	conjureReqFrag.appendChild(conjureReqSpan);
	if (conjureTime !== '') {
		const conjureReqSmall = document.createElement('small');
		conjureReqSmall.textContent = ` (${conjureTime})`;
		conjureReqFrag.appendChild(conjureReqSmall);
	}
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Conjure Baked Goods" Cookies Required', conjureReqFrag, 'GoldCookTooltipPlaceholder'));
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Conjure Baked Goods" Reward (MAX)', document.createTextNode(CM.Disp.Beautify(CM.Cache.ConjureReward)), 'GoldCookTooltipPlaceholder'));

	const conjureFrenzyColor = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.Conjure * 7) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const conjureFrenzyCur = Math.min((Game.cookies + CM.Disp.GetWrinkConfigBank()) * 0.15, CM.Cache.NoGoldSwitchCookiesPS * 60 * 30);
	const conjureFrenzyTime = ((Game.cookies + CM.Disp.GetWrinkConfigBank()) < CM.Cache.Conjure * 7) ? CM.Disp.FormatTime((CM.Cache.Conjure * 7 - (Game.cookies + CM.Disp.GetWrinkConfigBank())) / CM.Disp.GetCPS()) : '';

	const conjureFrenzyReqFrag = document.createDocumentFragment();
	const conjureFrenzyReqSpan = document.createElement('span');
	conjureFrenzyReqSpan.style.fontWeight = 'bold';
	conjureFrenzyReqSpan.className = CM.Disp.colorTextPre + conjureFrenzyColor;
	conjureFrenzyReqSpan.textContent = Beautify(CM.Cache.Conjure * 7);
	conjureFrenzyReqFrag.appendChild(conjureFrenzyReqSpan);
	if (conjureFrenzyTime !== '') {
		const conjureFrenzyReqSmall = document.createElement('small');
		conjureFrenzyReqSmall.textContent = ` (${conjureFrenzyTime})`;
		conjureFrenzyReqFrag.appendChild(conjureFrenzyReqSmall);
	}
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Conjure Baked Goods" Cookies Required (Frenzy)', conjureFrenzyReqFrag, 'GoldCookTooltipPlaceholder'));
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Conjure Baked Goods" Reward (MAX) (Frenzy)', document.createTextNode(CM.Disp.Beautify(CM.Cache.ConjureReward * 7)), 'GoldCookTooltipPlaceholder'));
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Conjure Baked Goods" Reward (CUR)', document.createTextNode(CM.Disp.Beautify(conjureFrenzyCur)), 'GoldCookTooltipPlaceholder'));
	if (CM.Cache.Edifice) {
		section.appendChild(CM.Disp.CreateStatsListing('withTooltip', '"Spontaneous Edifice" Cookies Required (most expensive building)', document.createTextNode(`${CM.Disp.Beautify(CM.Cache.Edifice)} (${CM.Cache.EdificeBuilding})`), 'GoldCookTooltipPlaceholder'));
	}
	return section;
};

/**
 * This function creates the "Garden" section of the stats page
 * @returns	{object}	section		The object contating the Spells section
 */
CM.Disp.CreateStatsGardenSection = function () {
	const section = document.createElement('div');
	section.className = 'CMStatsGardenSection';

	const bakeberryColor = (Game.cookies < Game.cookiesPs * 60 * 30) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const bakeberryFrag = document.createElement('span');
	bakeberryFrag.style.fontWeight = 'bold';
	bakeberryFrag.className = CM.Disp.colorTextPre + bakeberryColor;
	bakeberryFrag.textContent = Beautify(Game.cookiesPs * 60 * 30);
	section.appendChild(CM.Disp.CreateStatsListing('basic', 'Cookies required for max reward of Bakeberry: ', bakeberryFrag));

	const chocorootColor = (Game.cookies < Game.cookiesPs * 60 * 3) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const chocorootFrag = document.createElement('span');
	chocorootFrag.style.fontWeight = 'bold';
	chocorootFrag.className = CM.Disp.colorTextPre + chocorootColor;
	chocorootFrag.textContent = Beautify(Game.cookiesPs * 60 * 3);
	section.appendChild(CM.Disp.CreateStatsListing('basic', 'Cookies required for max reward of Chocoroot: ', chocorootFrag));

	const queenbeetColor = (Game.cookies < Game.cookiesPs * 60 * 60) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const queenbeetFrag = document.createElement('span');
	queenbeetFrag.style.fontWeight = 'bold';
	queenbeetFrag.className = CM.Disp.colorTextPre + queenbeetColor;
	queenbeetFrag.textContent = Beautify(Game.cookiesPs * 60 * 60);
	section.appendChild(CM.Disp.CreateStatsListing('basic', 'Cookies required for max reward of Queenbeet: ', queenbeetFrag));

	const duketaterColor = (Game.cookies < Game.cookiesPs * 60 * 120) ? CM.Disp.colorRed : CM.Disp.colorGreen;
	const duketaterFrag = document.createElement('span');
	duketaterFrag.style.fontWeight = 'bold';
	duketaterFrag.className = CM.Disp.colorTextPre + duketaterColor;
	duketaterFrag.textContent = Beautify(Game.cookiesPs * 60 * 120);
	section.appendChild(CM.Disp.CreateStatsListing('basic', 'Cookies required for max reward of Duketater: ', duketaterFrag));
	return section;
};

/**
 * This function creates the "Prestige" section of the stats page
 * @returns	{object}	section		The object contating the Prestige section
 */
CM.Disp.CreateStatsPrestigeSection = function () {
	const section = document.createElement('div');
	section.className = 'CMStatsPrestigeSection';

	const possiblePresMax = Math.floor(Game.HowMuchPrestige(CM.Cache.RealCookiesEarned
		+ Game.cookiesReset + CM.Cache.WrinklersTotal
		+ (Game.HasUnlocked('Chocolate egg') && !Game.Has('Chocolate egg') ? CM.Cache.lastChoEgg : 0)));
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', 'Prestige Level (CUR / MAX)', document.createTextNode(`${Beautify(Game.prestige)} / ${Beautify(possiblePresMax)}`), 'PrestMaxTooltipPlaceholder'));

	const neededCook = Game.HowManyCookiesReset(possiblePresMax + 1) - (CM.Cache.RealCookiesEarned + Game.cookiesReset + CM.Cache.WrinklersTotal + ((Game.HasUnlocked('Chocolate egg') && !Game.Has('Chocolate egg') ? CM.Cache.lastChoEgg : 0) ? CM.Cache.lastChoEgg : 0));
	const cookiesNextFrag = document.createDocumentFragment();
	cookiesNextFrag.appendChild(document.createTextNode(Beautify(neededCook)));
	const cookiesNextSmall = document.createElement('small');
	cookiesNextSmall.textContent = ` (${CM.Disp.FormatTime(neededCook / CM.Cache.AvgCPSWithChoEgg, 1)})`;
	cookiesNextFrag.appendChild(cookiesNextSmall);
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', 'Cookies To Next Level', cookiesNextFrag, 'NextPrestTooltipPlaceholder'));

	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', 'Heavenly Chips (CUR / MAX)', document.createTextNode(`${Beautify(Game.heavenlyChips)} / ${Beautify((possiblePresMax - Game.prestige) + Game.heavenlyChips)}`), 'HeavenChipMaxTooltipPlaceholder'));

	section.appendChild(CM.Disp.CreateStatsListing('basic', 'Heavenly Chips Per Second (last 5 seconds)', document.createTextNode(Beautify(CM.Cache.HCPerSecond, 2))));

	const HCTarget = Number(CM.Options.HeavenlyChipsTarget);
	if (!isNaN(HCTarget)) {
		const CookiesTillTarget = HCTarget - Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned));
		if (CookiesTillTarget > 0) {
			section.appendChild(CM.Disp.CreateStatsListing('basic', 'Heavenly Chips To Target Set In Settings (CUR)', document.createTextNode(Beautify(CookiesTillTarget))));
			section.appendChild(CM.Disp.CreateStatsListing('basic', 'Time To Target (CUR, Current 5 Second Average)', document.createTextNode(CM.Disp.FormatTime(CookiesTillTarget / CM.Cache.HCPerSecond))));
		}
	}

	const resetBonus = CM.Sim.ResetBonus(possiblePresMax);
	const resetFrag = document.createDocumentFragment();
	resetFrag.appendChild(document.createTextNode(Beautify(resetBonus)));
	const increase = Math.round(resetBonus / Game.cookiesPs * 10000);
	if (isFinite(increase) && increase !== 0) {
		const resetSmall = document.createElement('small');
		resetSmall.textContent = ` (${increase / 100}% of income)`;
		resetFrag.appendChild(resetSmall);
	}
	section.appendChild(CM.Disp.CreateStatsListing('withTooltip', 'Reset Bonus Income', resetFrag, 'ResetTooltipPlaceholder'));

	const currentPrestige = Math.floor(Game.HowMuchPrestige(Game.cookiesReset));
	const willHave = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned));
	const willGet = willHave - currentPrestige;
	if (!Game.Has('Lucky digit')) {
		let delta7 = 7 - (willHave % 10);
		if (delta7 < 0) delta7 += 10;
		const next7Reset = willGet + delta7;
		const next7Total = willHave + delta7;
		const frag7 = document.createDocumentFragment();
		frag7.appendChild(document.createTextNode(`${next7Total.toLocaleString()} / ${next7Reset.toLocaleString()} (+${delta7})`));
		section.appendChild(CM.Disp.CreateStatsListing('basic', 'Next "Lucky Digit" (total / reset)', frag7));
	}

	if (!Game.Has('Lucky number')) {
		let delta777 = 777 - (willHave % 1000);
		if (delta777 < 0) delta777 += 1000;
		const next777Reset = willGet + delta777;
		const next777Total = willHave + delta777;
		const frag777 = document.createDocumentFragment();
		frag777.appendChild(document.createTextNode(`${next777Total.toLocaleString()} / ${next777Reset.toLocaleString()} (+${delta777})`));
		section.appendChild(CM.Disp.CreateStatsListing('basic', 'Next "Lucky Number" (total / reset)', frag777));
	}

	if (!Game.Has('Lucky payout')) {
		let delta777777 = 777777 - (willHave % 1000000);
		if (delta777777 < 0) delta777777 += 1000000;
		const next777777Reset = willGet + delta777777;
		const next777777Total = willHave + delta777777;
		const frag777777 = document.createDocumentFragment();
		frag777777.appendChild(document.createTextNode(`${next777777Total.toLocaleString()} / ${next777777Reset.toLocaleString()} (+${delta777777})`));
		section.appendChild(CM.Disp.CreateStatsListing('basic', 'Next "Lucky Payout" (total / reset)', frag777777));
	}

	return section;
};

/**
 * This function creates the missing upgrades sections for prestige, normal and cookie upgrades
 * It is called by CM.Disp.AddMenuStats() when CM.Options.MissingUpgrades is set
 */
CM.Disp.AddMissingUpgrades = function () {
	for (const menuSection of (l('menu').children)) {
		if (menuSection.children[0]) {
			if (menuSection.children[0].innerHTML === 'Prestige' && CM.Cache.MissingUpgradesPrestige) {
				const prestigeUpgradesMissing = CM.Cache.MissingUpgradesPrestige.match(new RegExp('div', 'g') || []).length / 2;
				const title = document.createElement('div');
				title.id = 'CMMissingUpgradesPrestigeTitle';
				title.className = 'listing';
				const titlefrag = document.createElement('div');
				titlefrag.innerHTML = `<b>Missing Prestige upgrades:</b> ${prestigeUpgradesMissing}/${Game.PrestigeUpgrades.length} (${Math.floor((prestigeUpgradesMissing / Game.PrestigeUpgrades.length) * 100)}%)`;
				title.appendChild(titlefrag);
				menuSection.appendChild(title);
				const upgrades = document.createElement('div');
				upgrades.className = 'listing crateBox';
				upgrades.innerHTML = CM.Cache.MissingUpgradesPrestige;
				menuSection.appendChild(upgrades);
			} else if (menuSection.children[0].innerHTML === 'Upgrades') {
				if (CM.Cache.MissingUpgrades) {
					const normalUpgradesMissing = CM.Cache.MissingUpgrades.match(new RegExp('div', 'g') || []).length / 2;
					const title = document.createElement('div');
					title.id = 'CMMissingUpgradesTitle';
					title.className = 'listing';
					const titlefrag = document.createElement('div');
					titlefrag.innerHTML = `<b>Missing normal upgrades:</b> ${normalUpgradesMissing}/${Game.UpgradesByPool[''].length + Game.UpgradesByPool.tech.length} (${Math.floor((normalUpgradesMissing / (Game.UpgradesByPool[''].length + Game.UpgradesByPool.tech.length)) * 100)}%)`;
					title.appendChild(titlefrag);
					menuSection.insertBefore(title, menuSection.childNodes[3]);
					const upgrades = document.createElement('div');
					upgrades.className = 'listing crateBox';
					upgrades.innerHTML = CM.Cache.MissingUpgrades;
					menuSection.insertBefore(upgrades, document.getElementById('CMMissingUpgradesTitle').nextSibling);
				}
				if (CM.Cache.MissingUpgradesCookies) {
					const cookieUpgradesMissing = CM.Cache.MissingUpgradesCookies.match(new RegExp('div', 'g') || []).length / 2;
					const title = document.createElement('div');
					title.id = 'CMMissingUpgradesCookiesTitle';
					title.className = 'listing';
					const titlefrag = document.createElement('div');
					titlefrag.innerHTML = `<b>Missing Cookie upgrades:</b> ${cookieUpgradesMissing}/${Game.UpgradesByPool.cookie.length} (${Math.floor((cookieUpgradesMissing / Game.UpgradesByPool.cookie.length) * 100)}%)`;
					title.appendChild(titlefrag);
					menuSection.appendChild(title);
					const upgrades = document.createElement('div');
					upgrades.className = 'listing crateBox';
					upgrades.innerHTML = CM.Cache.MissingUpgradesCookies;
					menuSection.appendChild(upgrades);
				}
			}
		}
	}
};

/**
 * This function returns the "crates" (icons) for missing upgrades in the stats sections
 * It returns a html string that gets appended to the respective CM.Cache.MissingUpgrades-variable by CM.Cache.CacheMissingUpgrades()
 * It is also called by CM.Cache.CacheMissingUpgrades() for every non bought upgrade
 * @param	{object}	me	The upgrade object
 * @returns	{string}	?	The HTML string that creates the icon.
 */
CM.Disp.crateMissing = function (me) {
	let classes = 'crate upgrade missing';
	if (me.pool === 'prestige') classes += ' heavenly';

	let noFrame = 0;
	if (!Game.prefs.crates) noFrame = 1;
	if (noFrame) classes += ' noFrame';

	let icon = me.icon;
	if (me.iconFunction) icon = me.iconFunction();
	const tooltip = `function() {return Game.crateTooltip(Game.UpgradesById[${me.id}], 'stats');}`;
	return `<div class="${classes}"
	${Game.getDynamicTooltip(tooltip, 'top', true)}
	style = "${(`${icon[2] ? `background-image: url(${icon[2]});` : ''}background-position:${-icon[0] * 48}px ${-icon[1] * 48}px`)};">
	</div>`;
};

/**
 * Section: Functions related to the Stats page

/**
 * This function adds stats created by CookieMonster to the stats page
 * It is called by CM.Disp.AddMenu
 * @param {object} title	On object that includes the title of the menu
 */
CM.Disp.AddMenuInfo = function (title) {
	const info = document.createElement('div');
	info.className = 'subsection';

	const span = document.createElement('span');
	span.style.cursor = 'pointer';
	span.style.display = 'inline-block';
	span.style.height = '14px';
	span.style.width = '14px';
	span.style.borderRadius = '7px';
	span.style.textAlign = 'center';
	span.style.backgroundColor = '#C0C0C0';
	span.style.color = 'black';
	span.style.fontSize = '13px';
	span.style.verticalAlign = 'middle';
	span.textContent = CM.Options.Header.InfoTab ? '-' : '+';
	span.onclick = function () { CM.Config.ToggleHeader('InfoTab'); Game.UpdateMenu(); };
	title.appendChild(span);
	info.appendChild(title);

	if (CM.Options.Header.InfoTab) {
		const description = document.createElement('div');
		description.innerHTML = CM.Data.ModDescription;
		info.appendChild(description);
		const notes = document.createElement('div');
		notes.innerHTML = CM.Data.LatestReleaseNotes;
		info.appendChild(notes);
	}

	const menu = l('menu').children[1];
	menu.insertBefore(info, menu.children[1]);
};

/**
 * Section: Functions related to the left column of the page */

/**
 * This function creates two objects at the bottom of the left column that allowing popping of wrinklers
 * It is called by CM.Main.DelayInit()
 */
CM.Disp.CreateWrinklerButtons = function () {
	const popAllA = document.createElement('a');
	popAllA.id = 'PopAllNormalWrinklerButton';
	popAllA.textContent = 'Pop All Normal';
	popAllA.className = 'option';
	popAllA.onclick = function () { CM.Disp.PopAllNormalWrinklers(); };
	l('sectionLeftExtra').children[0].append(popAllA);
	const popFattestA = document.createElement('a');
	popFattestA.id = 'PopFattestWrinklerButton';
	popFattestA.textContent = 'Pop Single Fattest';
	popFattestA.className = 'option';
	popFattestA.onclick = function () { if (CM.Cache.WrinklersFattest[1]) Game.wrinklers[CM.Cache.WrinklersFattest[1]].hp = 0; };
	l('sectionLeftExtra').children[0].append(popFattestA);
};

/**
 * This function updates the display setting of the two objects created by CM.Disp.CreateWrinklerButtons()
 * It is called by changes in CM.Options.WrinklerButtons
 */
CM.Disp.UpdateWrinklerButtons = function () {
	if (CM.Options.WrinklerButtons) {
		l('PopAllNormalWrinklerButton').style.display = '';
		l('PopFattestWrinklerButton').style.display = '';
	} else {
		l('PopAllNormalWrinklerButton').style.display = 'none';
		l('PopFattestWrinklerButton').style.display = 'none';
	}
};

/**
 * Section: Variables used in Disp functions */

/**
 * This list is used to make some very basic tooltips.
 * It is used by CM.Main.DelayInit() in the call of CM.Disp.CreateSimpleTooltip()
 * @item	{string}	placeholder
 * @item	{string}	text
 * @item	{string}	minWidth
 */
CM.Disp.TooltipText = [
	['GoldCookTooltipPlaceholder', 'Calculated with Golden Switch off', '200px'],
	['GoldCookDragonsFortuneTooltipPlaceholder', 'Calculated with Golden Switch off and at least one golden cookie on-screen', '240px'],
	['PrestMaxTooltipPlaceholder', 'The MAX prestige is calculated with the cookies gained from popping all wrinklers with Skruuia god in Diamond slot, selling all stock market goods, selling all buildings with Earth Shatterer and Reality Bending auras, and buying Chocolate egg', '320px'],
	['NextPrestTooltipPlaceholder', 'Calculated with cookies gained from wrinklers and Chocolate egg', '200px'],
	['HeavenChipMaxTooltipPlaceholder', 'The MAX heavenly chips is calculated with the cookies gained from popping all wrinklers with Skruuia god in Diamond slot, selling all stock market goods, selling all buildings with Earth Shatterer and Reality Bending auras, and buying Chocolate egg', '330px'],
	['ResetTooltipPlaceholder', 'The bonus income you would get from new prestige levels unlocked at 100% of its potential and from ascension achievements if you have the same buildings/upgrades after reset', '370px'],
	['ChoEggTooltipPlaceholder', 'The amount of cookies you would get from popping all wrinklers with Skruuia god in Diamond slot, selling all stock market goods, selling all buildings with Earth Shatterer and Reality Bending auras, and then buying Chocolate egg', '300px'],
	['ChainNextLevelPlaceholder', 'Cheated cookies might break this formula', '250px'],
];

/**
 * These are variables used to create DOM object names and id (e.g., 'CMTextTooltip)
 */
CM.Disp.colorTextPre = 'CMText';
CM.Disp.colorBackPre = 'CMBack';
CM.Disp.colorBorderPre = 'CMBorder';

/**
 * These are variables which can be set in the options by the user to standardize colours throughout CookieMonster
 */
CM.Disp.colorBlue = 'Blue';
CM.Disp.colorGreen = 'Green';
CM.Disp.colorYellow = 'Yellow';
CM.Disp.colorOrange = 'Orange';
CM.Disp.colorRed = 'Red';
CM.Disp.colorPurple = 'Purple';
CM.Disp.colorGray = 'Gray';
CM.Disp.colorPink = 'Pink';
CM.Disp.colorBrown = 'Brown';
CM.Disp.colors = [CM.Disp.colorGray, CM.Disp.colorBlue, CM.Disp.colorGreen, CM.Disp.colorYellow, CM.Disp.colorOrange, CM.Disp.colorRed, CM.Disp.colorPurple, CM.Disp.colorPink, CM.Disp.colorBrown];

/**
 * This array is used to give certain timers specific colours
 */
CM.Disp.buffColors = {
	Frenzy: CM.Disp.colorYellow, 'Dragon Harvest': CM.Disp.colorBrown, 'Elder frenzy': CM.Disp.colorGreen, Clot: CM.Disp.colorRed, 'Click frenzy': CM.Disp.colorBlue, Dragonflight: CM.Disp.colorPink,
};

/**
 * This array is used to track GC timers
 */
CM.Disp.GCTimers = {};

/**
 * These arrays are used in the stats page to show
 * average cookies per {CM.Disp.cookieTimes/CM.Disp.clickTimes} seconds
 */
CM.Disp.cookieTimes = [10, 15, 30, 60, 300, 600, 900, 1800];
CM.Disp.clickTimes = [1, 5, 10, 15, 30];

/**
 * This array is used to store whether a Wrinkler tooltip is being shown or not
 * [i] = 1 means tooltip is being shown, [i] = 0 means hidden
 * It is used by CM.Disp.CheckWrinklerTooltip() and CM.Main.AddWrinklerAreaDetect()
 */
CM.Disp.TooltipWrinklerBeingShown = [];

/**
 * These are variables used by the functions that create tooltips for wrinklers
 * See CM.Disp.CheckWrinklerTooltip(), CM.Disp.UpdateWrinklerTooltip() and CM.Main.AddWrinklerAreaDetect()
 */
CM.Disp.TooltipWrinklerArea = 0;
CM.Disp.TooltipWrinkler = -1;

/**
 * Used to store the number of cookies to be displayed in the tab-title
 */
CM.Disp.Title = '';
/**
 * Main *
 */

/**
 * Section: Functions related to the main and initialization loop */

/**
 * Main loop of Cookie Monster
 * CM.init registers it to the "logic" hook provided by the modding api
 */
CM.Main.Loop = function () {
	if (CM.Disp.lastAscendState !== Game.OnAscend) {
		CM.Disp.lastAscendState = Game.OnAscend;
		CM.Disp.UpdateAscendState();
	}
	if (!Game.OnAscend && Game.AscendTimer === 0) {
		// Check if any other mods have been loaded
		if (CM.Main.LastModCount !== Object.keys(Game.mods).length) {
			CM.Sim.CreateSimFunctions();
			CM.Sim.InitData();
			CM.Cache.InitCache();
			CM.Main.LastModCount = Object.keys(Game.mods).length;
		}

		// CM.Sim.DoSims is set whenever CPS has changed
		if (CM.Sim.DoSims) {
			CM.Cache.CacheIncome();

			CM.Cache.NoGoldSwitchCPS(); // Needed first
			CM.Cache.CacheGoldenAndWrathCookiesMults();
			CM.Cache.CacheStats();
			CM.Cache.CacheMissingUpgrades();
			CM.Cache.CacheChain();
			CM.Cache.CacheDragonCost();

			CM.Cache.CacheSeaSpec();
			CM.Cache.CacheSellForChoEgg();

			CM.Sim.DoSims = 0;
		}

		// Check for aura change to recalculate buildings prices
		const hasBuildAura = Game.auraMult('Fierce Hoarder') > 0;
		if (!CM.Cache.HadBuildAura && hasBuildAura) {
			CM.Cache.HadBuildAura = true;
			CM.Cache.DoRemakeBuildPrices = 1;
		} else if (CM.Cache.HadBuildAura && !hasBuildAura) {
			CM.Cache.HadBuildAura = false;
			CM.Cache.DoRemakeBuildPrices = 1;
		}

		if (CM.Cache.DoRemakeBuildPrices) {
			CM.Cache.CacheBuildingsPrices();
			CM.Cache.DoRemakeBuildPrices = 0;
		}

		CM.Cache.LoopCache();

		// Check all changing minigames and game-states
		CM.Main.CheckGoldenCookie();
		CM.Main.CheckTickerFortune();
		CM.Main.CheckSeasonPopup();
		CM.Main.CheckGardenTick();
		CM.Main.CheckMagicMeter();
		CM.Main.CheckWrinklerCount();
	}
};

/**
 * Initialization loop of Cookie Monster
 * Called by CM.init()
 */
CM.Main.DelayInit = function () {
	// Create CM.Sim functions
	CM.Sim.CreateSimFunctions();

	CM.Sim.InitData();
	CM.Cache.InitCache();

	// Stored to check if we need to re-initiliaze data
	CM.Main.LastModCount = Object.keys(Game.mods).length;

	// Creating visual elements
	CM.Disp.CreateCssArea();
	CM.Disp.CreateBotBar();
	CM.Disp.CreateTimerBar();
	CM.Disp.CreateUpgradeBar();
	CM.Disp.CreateWhiteScreen();
	CM.Disp.CreateFavicon();
	for (const i of Object.keys(CM.Disp.TooltipText)) {
		CM.Disp.CreateSimpleTooltip(CM.Disp.TooltipText[i][0], CM.Disp.TooltipText[i][1], CM.Disp.TooltipText[i][2]);
	}
	CM.Disp.CreateWrinklerButtons();
	CM.Disp.UpdateBuildingUpgradeStyle();
	CM.Main.ReplaceTooltips();
	CM.Main.AddWrinklerAreaDetect();

	// Replace native functions
	CM.Main.ReplaceNative();
	CM.Main.ReplaceNativeGrimoire();
	Game.CalculateGains();

	CM.Config.LoadConfig(); // Must be after all things are created!
	CM.Disp.lastAscendState = Game.OnAscend;

	if (Game.prefs.popups) Game.Popup(`Cookie Monster version ${CM.VersionMajor}.${CM.VersionMinor} loaded!`);
	else Game.Notify(`Cookie Monster version ${CM.VersionMajor}.${CM.VersionMinor} loaded!`, '', '', 1, 1);

	Game.Win('Third-party');
};

/**
 * Section: Functions related to replacing stuff */

/**
 * This function replaces certain native (from the base-game) functions
 * It is called by CM.Main.DelayInit()
 */
CM.Main.ReplaceNative = function () {
	CM.Backup.Beautify = Beautify;
	Beautify = CM.Disp.Beautify;

	CM.Backup.CalculateGains = Game.CalculateGains;
	eval(`CM.Backup.CalculateGainsMod = ${Game.CalculateGains.toString().split('ages\');').join('ages\');CM.Sim.DateAges = Date.now();').split('if (Game.Has(\'Century')
		.join('CM.Sim.DateCentury = Date.now();if (Game.Has(\'Century')}`);
	Game.CalculateGains = function () {
		CM.Backup.CalculateGainsMod();
		CM.Sim.DoSims = 1;
	};

	CM.Backup.tooltip = {};
	CM.Backup.tooltip.draw = Game.tooltip.draw;
	eval(`CM.Backup.tooltip.drawMod = ${Game.tooltip.draw.toString().split('this').join('Game.tooltip')}`);
	Game.tooltip.draw = function (from, text, origin) {
		CM.Backup.tooltip.drawMod(from, text, origin);
	};

	CM.Backup.tooltip.update = Game.tooltip.update;
	eval(`CM.Backup.tooltip.updateMod = ${Game.tooltip.update.toString().split('this.').join('Game.tooltip.')}`);
	Game.tooltip.update = function () {
		CM.Backup.tooltip.updateMod();
		CM.Disp.UpdateTooltipLocation();
	};

	CM.Backup.UpdateWrinklers = Game.UpdateWrinklers;
	Game.UpdateWrinklers = function () {
		CM.Main.FixMouseY(CM.Backup.UpdateWrinklers);
	};

	CM.Backup.UpdateSpecial = Game.UpdateSpecial;
	Game.UpdateSpecial = function () {
		CM.Main.FixMouseY(CM.Backup.UpdateSpecial);
	};

	// Assumes newer browsers
	l('bigCookie').removeEventListener('click', Game.ClickCookie, false);
	l('bigCookie').addEventListener('click', function () { CM.Main.FixMouseY(Game.ClickCookie); }, false);

	CM.Backup.RebuildUpgrades = Game.RebuildUpgrades;
	Game.RebuildUpgrades = function () {
		CM.Backup.RebuildUpgrades();
		CM.Disp.ReplaceTooltipUpgrade();
		Game.CalculateGains();
	};

	CM.Backup.ClickProduct = Game.ClickProduct;
	/**
	 * This function adds a check to the purchase of a building to allow BulkBuyBlock to work.
	 * If the options is 1 (on) bulkPrice is under cookies you can't buy the building.
	 */
	Game.ClickProduct = function (what) {
		if (!CM.Options.BulkBuyBlock || Game.ObjectsById[what].bulkPrice < Game.cookies) {
			CM.Backup.ClickProduct(what);
		}
	};

	CM.Backup.DescribeDragonAura = Game.DescribeDragonAura;
	/**
	 * This function adds the function CM.Disp.AddAuraInfo() to Game.DescribeDragonAura()
	 * This adds information about CPS differences and costs to the aura choosing interface
	 * @param	{number}	aura	The number of the aura currently selected by the mouse/user
	 */
	Game.DescribeDragonAura = function (aura) {
		CM.Backup.DescribeDragonAura(aura);
		CM.Disp.AddAuraInfo(aura);
	};

	CM.Backup.ToggleSpecialMenu = Game.ToggleSpecialMenu;
	/**
	 * This function adds the code to display the tooltips for the levelUp button of the dragon
	 */
	Game.ToggleSpecialMenu = function (on) {
		CM.Backup.ToggleSpecialMenu(on);
		CM.Disp.AddDragonLevelUpTooltip();
	};

	CM.Backup.UpdateMenu = Game.UpdateMenu;
	Game.UpdateMenu = function () {
		if (typeof jscolor.picker === 'undefined' || typeof jscolor.picker.owner === 'undefined') {
			CM.Backup.UpdateMenu();
			CM.Disp.AddMenu();
		}
	};

	CM.Backup.sayTime = Game.sayTime;
	CM.Disp.sayTime = function (time, detail) {
		if (Number.isNaN(time) || time <= 0) return CM.Backup.sayTime(time, detail);
		else return CM.Disp.FormatTime(time / Game.fps, 1);
	};

	// Since the Ascend Tooltip is not actually a tooltip we need to add our additional info here...
	CM.Backup.Logic = Game.Logic;
	CM.Backup.LogicMod = new Function(
		`return ${Game.Logic.toString()
			.split('document.title')
			.join('CM.Disp.Title')
			.split("' more cookies</b> for the next level.<br>';")
			.join("` more cookies</b> for the next level.<br>${CM.Options.TooltipAscendButton ? `<div class='line'></div>It takes ${CM.Cache.TimeTillNextPrestige} to reach the next level and you are making ${Beautify(CM.Cache.HCPerSecond, 2)} chips on average in the last 5 seconds.<br>` : ``}`;")}`,
	)();
	Game.Logic = function () {
		CM.Backup.LogicMod();
		// Update Title
		CM.Disp.UpdateTitle();
	};
};

/**
 * This function fixes replaces the Launch and Draw functions of the Grimoire
 * It is called by CM.Main.DelayInit() and Game.LoadMinigames()
 */
CM.Main.ReplaceNativeGrimoire = function () {
	CM.Main.ReplaceNativeGrimoireLaunch();
	CM.Main.ReplaceNativeGrimoireDraw();
};

/**
 * This function fixes replaces the .launch function of the Grimoire
 * It is called by CM.Main.ReplaceNativeGrimoire()
 */
CM.Main.ReplaceNativeGrimoireLaunch = function () {
	if (!CM.Main.HasReplaceNativeGrimoireLaunch && Game.Objects['Wizard tower'].minigameLoaded) {
		const minigame = Game.Objects['Wizard tower'].minigame;
		CM.Backup.GrimoireLaunch = minigame.launch;
		eval(`CM.Backup.GrimoireLaunchMod = ${minigame.launch.toString().split('=this').join('= Game.Objects[\'Wizard tower\'].minigame')}`);
		Game.Objects['Wizard tower'].minigame.launch = function () {
			CM.Backup.GrimoireLaunchMod();
			CM.Main.ReplaceTooltipGrimoire();
			CM.HasReplaceNativeGrimoireDraw = false;
			CM.Main.ReplaceNativeGrimoireDraw();
		};
		CM.Main.HasReplaceNativeGrimoireLaunch = true;
	}
};

/**
 * This function fixes replaces the .draw function of the Grimoire
 * It is called by CM.Main.ReplaceNativeGrimoire()
 */
CM.Main.ReplaceNativeGrimoireDraw = function () {
	if (!CM.Main.HasReplaceNativeGrimoireDraw && Game.Objects['Wizard tower'].minigameLoaded) {
		const minigame = Game.Objects['Wizard tower'].minigame;
		CM.Backup.GrimoireDraw = minigame.draw;
		Game.Objects['Wizard tower'].minigame.draw = function () {
			CM.Backup.GrimoireDraw();
			if (CM.Options.GrimoireBar === 1 && minigame.magic < minigame.magicM) {
				minigame.magicBarTextL.innerHTML += ` (${CM.Disp.FormatTime(CM.Disp.CalculateGrimoireRefillTime(minigame.magic, minigame.magicM, minigame.magicM))})`;
			}
		};
		CM.Main.HasReplaceNativeGrimoireDraw = true;
	}
};

/**
 * Section: Functions related to first initizalition of CM */

/**
 * This function call all functions that replace Game-tooltips with CM-enhanced tooltips
 * It is called by CM.Main.DelayInit()
 */
CM.Main.ReplaceTooltips = function () {
	CM.Main.ReplaceTooltipBuild();
	CM.Main.ReplaceTooltipLump();

	// Replace Tooltips of Minigames. Nesting it in LoadMinigames makes sure to replace them even if
	// they were not loaded initially
	CM.Backup.LoadMinigames = Game.LoadMinigames;
	Game.LoadMinigames = function () {
		CM.Backup.LoadMinigames();
		CM.Main.ReplaceTooltipGarden();
		CM.Main.ReplaceTooltipGrimoire();
		CM.Main.ReplaceNativeGrimoire();
	};
	Game.LoadMinigames();
};

/**
 * Section: Functions related to replacing tooltips */

/**
 * This function replaces the original .onmouseover functions of buildings so that it calls CM.Disp.Tooltip()
 * CM.Disp.Tooltip() sets the tooltip type to 'b'
 * It is called by CM.Main.ReplaceTooltips()
 */
CM.Main.ReplaceTooltipBuild = function () {
	CM.Main.TooltipBuildBackup = [];
	for (const i of Object.keys(Game.Objects)) {
		const me = Game.Objects[i];
		if (l(`product${me.id}`).onmouseover !== null) {
			CM.Main.TooltipBuildBackup[i] = l(`product${me.id}`).onmouseover;
			eval(`l('product' + me.id).onmouseover = function() {Game.tooltip.dynamic = 1; Game.tooltip.draw(this, function() {return CM.Disp.Tooltip('b', '${i}');}, 'store'); Game.tooltip.wobble();}`);
		}
	}
};

/**
 * This function replaces the original .onmouseover functions of sugar lumps so that it calls CM.Disp.Tooltip()
 * CM.Disp.Tooltip() sets the tooltip type to 's'
 * It is called by CM.Main.ReplaceTooltips()
 */
CM.Main.ReplaceTooltipLump = function () {
	if (Game.canLumps()) {
		CM.Main.TooltipLumpBackup = l('lumps').onmouseover;
		eval('l(\'lumps\').onmouseover = function() {Game.tooltip.dynamic = 1; Game.tooltip.draw(this, function() {return CM.Disp.Tooltip(\'s\', \'Lump\');}, \'this\'); Game.tooltip.wobble();}');
	}
};

/**
 * This function replaces the original .onmouseover functions of the Grimoire minigame so that it calls CM.Disp.Tooltip()
 * CM.Disp.Tooltip() sets the tooltip type to 'g'
 * It is called by CM.Main.ReplaceTooltips()
 */
CM.Main.ReplaceTooltipGrimoire = function () {
	if (Game.Objects['Wizard tower'].minigameLoaded) {
		CM.Main.TooltipGrimoireBackup = [];
		for (const i in Game.Objects['Wizard tower'].minigame.spellsById) {
			if (l(`grimoireSpell${i}`).onmouseover !== null) {
				CM.Main.TooltipGrimoireBackup[i] = l(`grimoireSpell${i}`).onmouseover;
				eval(`l('grimoireSpell' + i).onmouseover = function() {Game.tooltip.dynamic = 1; Game.tooltip.draw(this, function() {return CM.Disp.Tooltip('g', '${i}');}, 'this'); Game.tooltip.wobble();}`);
			}
		}
	}
};

/**
 * This function replaces the original .onmouseover functions of all garden plants so that it calls CM.Disp.Tooltip()
 * CM.Disp.Tooltip() sets the tooltip type to 'p'
 * It is called by CM.Main.ReplaceTooltips()
 */
CM.Main.ReplaceTooltipGarden = function () {
	if (Game.Objects.Farm.minigameLoaded) {
		l('gardenTool-1').onmouseover = function () { Game.tooltip.dynamic = 1; Game.tooltip.draw(this, function () { return CM.Disp.Tooltip('ha', 'HarvestAllButton'); }, 'this'); Game.tooltip.wobble(); };
		Array.from(l('gardenPlot').children).forEach((child) => {
			const coords = child.id.slice(-3);
			child.onmouseover = function () { Game.tooltip.dynamic = 1; Game.tooltip.draw(this, function () { return CM.Disp.Tooltip('p', [`${coords[0]}`, `${coords[2]}`]); }, 'this'); Game.tooltip.wobble(); };
		});
	}
};

/**
 * Section: Functions related to checking for changes in Minigames/GC's/Ticker */

/**
 * Auxilirary function that finds all currently spawned shimmers.
 * CM.Cache.spawnedGoldenShimmer stores the non-user spawned cookie to later determine data for the favicon and tab-title
 * It is called by CM.CM.Main.CheckGoldenCookie
 */
CM.Main.FindShimmer = function () {
	CM.Main.currSpawnedGoldenCookieState = 0;
	CM.Cache.goldenShimmersByID = {};
	for (const i of Object.keys(Game.shimmers)) {
		CM.Cache.goldenShimmersByID[Game.shimmers[i].id] = Game.shimmers[i];
		if (Game.shimmers[i].spawnLead && Game.shimmers[i].type === 'golden') {
			CM.Cache.spawnedGoldenShimmer = Game.shimmers[i];
			CM.Main.currSpawnedGoldenCookieState += 1;
		}
	}
};

/**
 * This function checks for changes in the amount of Golden Cookies
 * It is called by CM.Main.Loop
 */
CM.Main.CheckGoldenCookie = function () {
	CM.Main.FindShimmer();
	for (const i of Object.keys(CM.Disp.GCTimers)) {
		if (typeof CM.Cache.goldenShimmersByID[i] === 'undefined') {
			CM.Disp.GCTimers[i].parentNode.removeChild(CM.Disp.GCTimers[i]);
			delete CM.Disp.GCTimers[i];
		}
	}
	if (CM.Main.lastGoldenCookieState !== Game.shimmerTypes.golden.n) {
		CM.Main.lastGoldenCookieState = Game.shimmerTypes.golden.n;
		if (CM.Main.lastGoldenCookieState) {
			if (CM.Main.lastSpawnedGoldenCookieState < CM.Main.currSpawnedGoldenCookieState) {
				CM.Disp.Flash(3, 'GCFlash');
				CM.Disp.PlaySound(CM.Options.GCSoundURL, 'GCSound', 'GCVolume');
				CM.Disp.Notification('GCNotification', 'Golden Cookie Spawned', 'A Golden Cookie has spawned. Click it now!');
			}

			for (const i of Object.keys(Game.shimmers)) {
				if (typeof CM.Disp.GCTimers[Game.shimmers[i].id] === 'undefined') {
					CM.Disp.CreateGCTimer(Game.shimmers[i]);
				}
			}
		}
		CM.Disp.UpdateFavicon();
		CM.Main.lastSpawnedGoldenCookieState = CM.Main.currSpawnedGoldenCookieState;
		if (CM.Main.currSpawnedGoldenCookieState === 0) CM.Cache.spawnedGoldenShimmer = 0;
	} else if (CM.Options.GCTimer === 1 && CM.Main.lastGoldenCookieState) {
		for (const i of Object.keys(CM.Disp.GCTimers)) {
			CM.Disp.GCTimers[i].style.opacity = CM.Cache.goldenShimmersByID[i].l.style.opacity;
			CM.Disp.GCTimers[i].style.transform = CM.Cache.goldenShimmersByID[i].l.style.transform;
			CM.Disp.GCTimers[i].textContent = Math.ceil(CM.Cache.goldenShimmersByID[i].life / Game.fps);
		}
	}
};

/**
 * This function checks if there is reindeer that has spawned
 * It is called by CM.Main.Loop
 */
CM.Main.CheckSeasonPopup = function () {
	if (CM.Main.lastSeasonPopupState !== Game.shimmerTypes.reindeer.spawned) {
		CM.Main.lastSeasonPopupState = Game.shimmerTypes.reindeer.spawned;
		for (const i of Object.keys(Game.shimmers)) {
			if (Game.shimmers[i].spawnLead && Game.shimmers[i].type === 'reindeer') {
				CM.Cache.seasonPopShimmer = Game.shimmers[i];
				break;
			}
		}
		CM.Disp.Flash(3, 'SeaFlash');
		CM.Disp.PlaySound(CM.Options.SeaSoundURL, 'SeaSound', 'SeaVolume');
		CM.Disp.Notification('SeaNotification', 'Reindeer sighted!', 'A Reindeer has spawned. Click it now!');
	}
};

/**
 * This function checks if there is a fortune cookie on the ticker
 * It is called by CM.Main.Loop
 */
CM.Main.CheckTickerFortune = function () {
	if (CM.Main.lastTickerFortuneState !== (Game.TickerEffect && Game.TickerEffect.type === 'fortune')) {
		CM.Main.lastTickerFortuneState = (Game.TickerEffect && Game.TickerEffect.type === 'fortune');
		if (CM.Main.lastTickerFortuneState) {
			CM.Disp.Flash(3, 'FortuneFlash');
			CM.Disp.PlaySound(CM.Options.FortuneSoundURL, 'FortuneSound', 'FortuneVolume');
			CM.Disp.Notification('FortuneNotification', 'Fortune Cookie found', 'A Fortune Cookie has appeared on the Ticker.');
		}
	}
};

/**
 * This function checks if a garden tick has happened
 * It is called by CM.Main.Loop
 */
CM.Main.CheckGardenTick = function () {
	if (Game.Objects.Farm.minigameLoaded && CM.Main.lastGardenNextStep !== Game.Objects.Farm.minigame.nextStep) {
		if (CM.Main.lastGardenNextStep !== 0 && CM.Main.lastGardenNextStep < Date.now()) {
			CM.Disp.Flash(3, 'GardFlash');
			CM.Disp.PlaySound(CM.Options.GardSoundURL, 'GardSound', 'GardVolume');
		}
		CM.Main.lastGardenNextStep = Game.Objects.Farm.minigame.nextStep;
	}
};

/**
 * This function checks if the magic meter is full
 * It is called by CM.Main.Loop
 */
CM.Main.CheckMagicMeter = function () {
	if (Game.Objects['Wizard tower'].minigameLoaded && CM.Options.GrimoireBar === 1) {
		const minigame = Game.Objects['Wizard tower'].minigame;
		if (minigame.magic < minigame.magicM) CM.Main.lastMagicBarFull = false;
		else if (!CM.Main.lastMagicBarFull) {
			CM.Main.lastMagicBarFull = true;
			CM.Disp.Flash(3, 'MagicFlash');
			CM.Disp.PlaySound(CM.Options.MagicSoundURL, 'MagicSound', 'MagicVolume');
			CM.Disp.Notification('MagicNotification', 'Magic Meter full', 'Your Magic Meter is full. Cast a spell!');
		}
	}
};

/**
 * This function checks if any new Wrinklers have popped up
 * It is called by CM.Main.Loop
 */
CM.Main.CheckWrinklerCount = function () {
	if (Game.elderWrath > 0) {
		let CurrentWrinklers = 0;
		for (const i in Game.wrinklers) {
			if (Game.wrinklers[i].phase === 2) CurrentWrinklers++;
		}
		if (CurrentWrinklers > CM.Main.lastWrinklerCount) {
			CM.Main.lastWrinklerCount = CurrentWrinklers;
			if (CurrentWrinklers === Game.getWrinklersMax() && CM.Options.WrinklerMaxFlash) {
				CM.Disp.Flash(3, 'WrinklerMaxFlash');
			} else {
				CM.Disp.Flash(3, 'WrinklerFlash');
			}
			if (CurrentWrinklers === Game.getWrinklersMax() && CM.Options.WrinklerMaxSound) {
				CM.Disp.PlaySound(CM.Options.WrinklerMaxSoundURL, 'WrinklerMaxSound', 'WrinklerMaxVolume');
			} else {
				CM.Disp.PlaySound(CM.Options.WrinklerSoundURL, 'WrinklerSound', 'WrinklerVolume');
			}
			if (CurrentWrinklers === Game.getWrinklersMax() && CM.Options.WrinklerMaxNotification) {
				CM.Disp.Notification('WrinklerMaxNotification', 'Maximum Wrinklers Reached', 'You have reached your maximum ammount of wrinklers');
			} else {
				CM.Disp.Notification('WrinklerNotification', 'A Wrinkler appeared', 'A new wrinkler has appeared');
			}
		} else {
			CM.Main.lastWrinklerCount = CurrentWrinklers;
		}
	}
};

/**
 * This function creates .onmouseover/out events that determine if the mouse is hovering-over a Wrinkler
 * It is called by CM.Main.DelayInit
 * As wrinklers are not appended to the DOM we us a different system than for other tooltips
 */
CM.Main.AddWrinklerAreaDetect = function () {
	l('backgroundLeftCanvas').onmouseover = function () { CM.Disp.TooltipWrinklerArea = 1; };
	l('backgroundLeftCanvas').onmouseout = function () {
		CM.Disp.TooltipWrinklerArea = 0;
		Game.tooltip.hide();
		for (const i of Object.keys(Game.wrinklers)) {
			CM.Disp.TooltipWrinklerBeingShown[i] = 0;
		}
	};
};

/**
 * Section: Functions related to the mouse */

/**
 * This function fixes Game.mouseY as a result of bars that are added by CookieMonster
 * It is called by Game.UpdateWrinklers(), Game.UpdateSpecial() and the .onmousover of the BigCookie
 * before execution of their actual function
 */
CM.Main.FixMouseY = function (target) {
	if (CM.Options.TimerBar === 1 && CM.Options.TimerBarPos === 0) {
		const timerBarHeight = parseInt(CM.Disp.TimerBar.style.height);
		Game.mouseY -= timerBarHeight;
		target();
		Game.mouseY += timerBarHeight;
	} else {
		target();
	}
};
/**
 * Sim *
 */

/**
 * Section: Functions to calculate building buy and sell prices */

/**
 * This function calculates the total price for buying "increase" of a building
 * Base Game does not currently allow this
 * It is called by CM.Cache.CacheBuildingsPrices() and CM.Disp.Tooltip()
 * @param	{string}	build		Name of the building
 * @param	{number}	basePrice	Base Price of building
 * @param	{number}	start		Starting amount of building
 * @param	{number}	free		Free amount of building
 * @param	{number}	increase	Increase of building
 * @returns {number}	moni		Total price
 */
CM.Sim.BuildingGetPrice = function (build, basePrice, start, free, increase) {
	let moni = 0;
	for (let i = 0; i < increase; i++) {
		let price = basePrice * Game.priceIncrease ** Math.max(0, start - free);
		price = Game.modifyBuildingPrice(build, price);
		price = Math.ceil(price);
		moni += price;
		start++;
	}
	return moni;
};

/**
 * This function calculates the sell price of a building based on current "sim data"
 * It is called by CM.Sim.BuildingSell()
 * @param	{string}	building	Name of the building
 * @param	{number}	price		Current price of building
 * @returns {number}	price		The modified building price
 */
CM.Sim.modifyBuildingPrice = function (building, price) {
	if (CM.Sim.Has('Season savings')) price *= 0.99;
	if (CM.Sim.Has('Santa\'s dominion')) price *= 0.99;
	if (CM.Sim.Has('Faberge egg')) price *= 0.99;
	if (CM.Sim.Has('Divine discount')) price *= 0.99;
	if (CM.Sim.Has('Fortune #100')) price *= 0.99;
	// if (CM.Sim.hasAura('Fierce Hoarder')) price *= 0.98;
	price *= 1 - CM.Sim.auraMult('Fierce Hoarder') * 0.02;
	if (Game.hasBuff('Everything must go')) price *= 0.95;
	if (Game.hasBuff('Crafty pixies')) price *= 0.98;
	if (Game.hasBuff('Nasty goblins')) price *= 1.02;
	if (building.fortune && CM.Sim.Has(building.fortune.name)) price *= 0.93;
	price *= CM.Sim.eff('buildingCost');
	if (CM.Sim.Objects.Temple.minigameLoaded) {
		const godLvl = CM.Sim.hasGod('creation');
		if (godLvl === 1) price *= 0.93;
		else if (godLvl === 2) price *= 0.95;
		else if (godLvl === 3) price *= 0.98;
	}
	return price;
};

/**
 * This function calculates the sell multiplier based on current "sim data"
 * It is called by CM.Sim.BuildingSell()
 * @returns {number}	giveBack	The multiplier
 */
CM.Sim.getSellMultiplier = function () {
	let giveBack = 0.25;
	giveBack *= 1 + CM.Sim.auraMult('Earth Shatterer');
	return giveBack;
};

/**
 * This function calculates the cookies returned for selling a building
 * Base Game does not do this correctly
 * It is called by CM.Sim.SellBuildingsForChoEgg(), CM.Disp.Tooltip() and CM.Disp.Tooltip()
 * @param	{string}	build		Name of the building
 * @param	{number}	basePrice	Base Price of building
 * @param	{number}	start		Starting amount of building
 * @param	{number}	free		Free amount of building
 * @param	{number}	increase	Increase of building
 * @param	{number}	noSim		1 of 0 depending on if function is called from CM.Sim
 * @returns {number}	moni		Total price gained
 */
CM.Sim.BuildingSell = function (build, basePrice, start, free, amount, noSim) {
	// Calculate money gains from selling buildings
	// If noSim is set, use Game methods to compute price instead of Sim ones.
	noSim = typeof noSim === 'undefined' ? 0 : noSim;
	let moni = 0;
	if (amount === -1) amount = start;
	if (!amount) amount = Game.buyBulk;
	for (let i = 0; i < amount; i++) {
		let price = basePrice * Game.priceIncrease ** Math.max(0, start - free);
		price = noSim ? Game.modifyBuildingPrice(build, price) : CM.Sim.modifyBuildingPrice(build, price);
		price = Math.ceil(price);
		const giveBack = noSim ? build.getSellMultiplier() : CM.Sim.getSellMultiplier();
		price = Math.floor(price * giveBack);
		if (start > 0) {
			moni += price;
			start--;
		}
	}
	return moni;
};

/**
 * Section: Functions related to making functions that check against sim data rather than game data */

/**
 * This functions helps create functions that check sim data
 * For example, instead of Game.Has, a function that has gone through CM.Sim.ReplaceFunction will use CM.Sim.Has()
 * Subsequently the function rather than checking Game.Upgrades, will check CM.Sim.Upgrades
 *
 * It is called by CM.Sim.ReplaceRelevantFunctions()
 * @param	{function}	funcToBeReplaced	Function to be replaced
 * @returns {string}						The function in string form with only calls to CM.Sim
 */
CM.Sim.ReplaceFunction = function (funcToBeReplaced) {
	return funcToBeReplaced.toString()
		.split('Game.Upgrades[') // Include '[' to not replace Game.UpgradesByPool
		.join('CM.Sim.Upgrades[')
		.split('Game.Achievements')
		.join('CM.Sim.Achievements')
		.split('Game.Has')
		.join('CM.Sim.Has')
		.split('Game.dragonAura]')
		.join('CM.Sim.dragonAura]')
		.split('Game.dragonAura2]')
		.join('CM.Sim.dragonAura2]')
		.split('Game.auraMult')
		.join('CM.Sim.auraMult')
		.split('Game.hasGod')
		.join('CM.Sim.hasGod')
		.split('M.gods[what]') // Replaces code in the Pantheon minigame
		.join('CM.Sim.Objects.Temple.minigame.gods[what]')
		.split('M.slot[i]') // Replaces code in the Pantheon minigame
		.join('CM.Sim.Objects.Temple.minigame.slot[i]')
		.split('Game.effs') // Replaces code in the Pantheon minigame
		.join('CM.Sim.effs')
		.split('Game.Objects')
		.join('CM.Sim.Objects')
		.split('Game.GetTieredCpsMult') // Replace in .cps of building objects
		.join('CM.Sim.GetTieredCpsMult')
		.split('Game.eff') // Replace in .cps of building objects
		.join('CM.Sim.eff');
	// .split('syn.buildingTie1.amount')
	// .join('CM.Sim.Objects[syn.buildingTie1.name].amount')
	// .split('syn.buildingTie2.amount')
	// .join('CM.Sim.Objects[syn.buildingTie2.name].amount')
};

/**
 * This functions creates all functions by CM.Sim to check CM.Sim. data instead of Game. data
 * It does this by calling CM.Sim.ReplaceFunction()
 * It follows naming of the vanilla functions
 *
 * It is called by CM.Main.DelayInit()
 */
CM.Sim.CreateSimFunctions = function () {
	CM.Sim.Has = new Function(`return ${CM.Sim.ReplaceFunction(Game.Has)}`)();
	CM.Sim.HasAchiev = new Function(`return ${CM.Sim.ReplaceFunction(Game.HasAchiev)}`)();
	CM.Sim.hasAura = new Function(`return ${CM.Sim.ReplaceFunction(Game.hasAura)}`)();
	if (Game.hasGod) CM.Sim.hasGod = new Function(`return ${CM.Sim.ReplaceFunction(Game.hasGod)}`)();
	CM.Sim.GetHeavenlyMultiplier = new Function(`return ${CM.Sim.ReplaceFunction(Game.GetHeavenlyMultiplier)}`)();
	CM.Sim.auraMult = new Function(`return ${CM.Sim.ReplaceFunction(Game.auraMult)}`)();
	CM.Sim.eff = new Function(`return ${CM.Sim.ReplaceFunction(Game.eff)}`)();
	CM.Sim.GetTieredCpsMult = new Function(`return ${CM.Sim.ReplaceFunction(Game.GetTieredCpsMult)}`)();
};

/**
 * This function "wins" an achievement in the current sim data
 * It functions similarly to Game.Win()
 * It is not created by CM.Sim.CreateSimFunctions() in order to avoid spamming pop-ups upon winning
 * @param	{string}	what	Name of the achievement
 */
CM.Sim.Win = function (what) {
	if (CM.Sim.Achievements[what]) {
		if (CM.Sim.Achievements[what].won === 0) {
			CM.Sim.Achievements[what].won = 1;
			if (Game.Achievements[what].pool !== 'shadow') CM.Sim.AchievementsOwned++;
		}
	}
};

/**
 * Section: Functions used to create static objects of Buildings, Upgrades and Achievements */

/**
 * This function constructs an object with the static properties of a building,
 * but with a 'cps' method changed to use 'CM.Sim.Has' instead of 'Game.Has'
 * (and similar to 'hasAura', 'Objects', 'GetTieredCpsMult' and 'auraMult').
 *
 * The dynamic properties of the building, namely level and amount owned, are set by CM.Sim.CopyData.
 * It is called by CM.Sim.InitData() and CM.Sim.CopyData() if the upgrade is currently missing
 * @param	{string}	buildingName	Name of the building
 * @returns {Object}	you				The static object
 */
CM.Sim.InitialBuildingData = function (buildingName) {
	const me = Game.Objects[buildingName];
	const you = {};
	you.cps = new Function(`return ${CM.Sim.ReplaceFunction(me.cps)}`)();
	// Below is needed for above eval, specifically for the GetTieredCpsMult function
	you.baseCps = me.baseCps;
	you.name = me.name;
	you.tieredUpgrades = me.tieredUpgrades;
	you.synergies = me.synergies;
	you.fortune = me.fortune;
	you.grandma = me.grandma;
	you.baseCPS = me.baseCps;
	you.id = me.id;
	you.vanilla = me.vanilla;
	you.unshackleUpgrade = me.unshackleUpgrade;
	return you;
};

/**
 * This function constructs an object with the static properties of an upgrade
 * It is called by CM.Sim.InitData() and CM.Sim.CopyData() if the upgrade is currently missing
 * @param	{string}	upgradeName		Name of the Upgrade
 * @returns {Object}	you				The static object
 */
CM.Sim.InitUpgrade = function (upgradeName) {
	const me = Game.Upgrades[upgradeName];
	const you = {};
	// Some upgrades have a function for .power (notably the valentine cookies)
	you.power = me.power;
	if (typeof (me.power) === 'function') {
		me.power = new Function(`return ${CM.Sim.ReplaceFunction(me.power)}`)();
	}
	you.pool = me.pool;
	you.name = me.name;
	return you;
};

/**
 * This function constructs an object with the static properties of an achievement
 * It is called by CM.Sim.InitData() and CM.Sim.CopyData() if the achievement is currently missing
 * @param	{string}	achievementName	Name of the Achievement
 * @returns {Object}	you				The static object
 */
CM.Sim.InitAchievement = function (achievementName) {
	const me = Game.Achievements[achievementName];
	const you = {};
	you.name = me.name;
	return you;
};

/**
 * This function creates static objects for Buildings, Upgrades and Achievements
 * It is called by CM.Main.DelayInit()
 */
CM.Sim.InitData = function () {
	// Buildings
	CM.Sim.Objects = [];
	for (const i of Object.keys(Game.Objects)) {
		CM.Sim.Objects[i] = CM.Sim.InitialBuildingData(i);
	}

	// Upgrades
	CM.Sim.Upgrades = [];
	for (const i of Object.keys(Game.Upgrades)) {
		CM.Sim.Upgrades[i] = CM.Sim.InitUpgrade(i);
	}

	// Achievements
	CM.Sim.Achievements = [];
	for (const i of Object.keys(Game.Achievements)) {
		CM.Sim.Achievements[i] = CM.Sim.InitAchievement(i);
	}
	CM.Sim.CopyData();
};

/**
 * Section: Functions related to creating a new iteration of "sim data" */

/**
 * This function copies all relevant data and therefore sets a new iteration of the "sim data"
 * It is called at the start of any function that simulates certain behaviour or actions
 */
CM.Sim.CopyData = function () {
	// Other variables
	CM.Sim.UpgradesOwned = Game.UpgradesOwned;
	CM.Sim.pledges = Game.pledges;
	CM.Sim.AchievementsOwned = Game.AchievementsOwned;
	CM.Sim.heavenlyPower = Game.heavenlyPower;
	CM.Sim.prestige = Game.prestige;

	// Buildings
	for (const i of Object.keys(Game.Objects)) {
		const me = Game.Objects[i];
		let you = CM.Sim.Objects[i];
		if (you === undefined) { // New building!
			CM.Sim.Objects[i] = CM.Sim.InitialBuildingData(i);
			you = CM.Sim.Objects[i];
			CM.Disp.CreateBotBarBuildingColumn(i); // Add new building to the bottom bar
		}
		you.amount = me.amount;
		you.level = me.level;
		you.totalCookies = me.totalCookies;
		you.basePrice = me.basePrice;
		you.free = me.free;
		if (me.minigameLoaded) you.minigameLoaded = me.minigameLoaded; you.minigame = me.minigame;
	}

	// Upgrades
	for (const i of Object.keys(Game.Upgrades)) {
		const me = Game.Upgrades[i];
		let you = CM.Sim.Upgrades[i];
		if (you === undefined) {
			CM.Sim.Upgrades[i] = CM.Sim.InitUpgrade(i);
			you = CM.Sim.Upgrades[i];
		}
		you.bought = me.bought;
	}

	// Achievements
	for (const i of Object.keys(Game.Achievements)) {
		const me = Game.Achievements[i];
		let you = CM.Sim.Achievements[i];
		if (you === undefined) {
			CM.Sim.Achievements[i] = CM.Sim.InitAchievement(i);
			you = CM.Sim.Achievements[i];
		}
		you.won = me.won;
	}

	// Auras
	CM.Cache.CacheDragonAuras();
	CM.Sim.dragonAura = CM.Cache.dragonAura;
	CM.Sim.dragonAura2 = CM.Cache.dragonAura2;
};

/**
 * Section: Functions related to checking the CPS of the current sim data */

/**
 * This function calculates the CPS of the current "sim data"
 * It is similar to Game.CalculateGains()
 * It is called at the start of any function that simulates certain behaviour or actions
 * @global	{number}	CM.Sim.cookiesPs	The CPS of the current sim data
 */
CM.Sim.CalculateGains = function () {
	CM.Sim.cookiesPs = 0;
	let mult = 1;
	// Include minigame effects
	const effs = {};
	for (const i of Object.keys(Game.Objects)) {
		if (Game.Objects[i].minigameLoaded && Game.Objects[i].minigame.effs) {
			const myEffs = Game.Objects[i].minigame.effs;
			for (const ii in myEffs) {
				if (effs[ii]) effs[ii] *= myEffs[ii];
				else effs[ii] = myEffs[ii];
			}
		}
	}
	CM.Sim.effs = effs;

	if (Game.ascensionMode !== 1) mult += parseFloat(CM.Sim.prestige) * 0.01 * CM.Sim.heavenlyPower * CM.Sim.GetHeavenlyMultiplier();

	mult *= CM.Sim.eff('cps');

	if (CM.Sim.Has('Heralds') && Game.ascensionMode !== 1) mult *= 1 + 0.01 * Game.heralds;

	for (const i of Object.keys(Game.cookieUpgrades)) {
		const me = Game.cookieUpgrades[i];
		if (CM.Sim.Has(me.name)) {
			// Some upgrades have a function as .power (notably the valentine cookies)
			// CM.Sim.InitialBuildingData has changed to use CM.Sim.Has instead of Game.Has etc.
			// Therefore this call is to the .power of the Sim.Object
			if (typeof (me.power) === 'function') {
				mult *= 1 + (CM.Sim.Upgrades[me.name].power(CM.Sim.Upgrades[me.name]) * 0.01);
			} else mult *= 1 + (me.power * 0.01);
		}
	}

	if (CM.Sim.Has('Specialized chocolate chips')) mult *= 1.01;
	if (CM.Sim.Has('Designer cocoa beans')) mult *= 1.02;
	if (CM.Sim.Has('Underworld ovens')) mult *= 1.03;
	if (CM.Sim.Has('Exotic nuts')) mult *= 1.04;
	if (CM.Sim.Has('Arcane sugar')) mult *= 1.05;

	if (CM.Sim.Has('Increased merriness')) mult *= 1.15;
	if (CM.Sim.Has('Improved jolliness')) mult *= 1.15;
	if (CM.Sim.Has('A lump of coal')) mult *= 1.01;
	if (CM.Sim.Has('An itchy sweater')) mult *= 1.01;
	if (CM.Sim.Has('Santa\'s dominion')) mult *= 1.2;

	if (CM.Sim.Has('Fortune #100')) mult *= 1.01;
	if (CM.Sim.Has('Fortune #101')) mult *= 1.07;

	if (CM.Sim.Has('Dragon scale')) mult *= 1.03;

	// Check effect of chosen Gods
	let buildMult = 1;
	if (CM.Sim.hasGod) {
		let godLvl = CM.Sim.hasGod('asceticism');
		if (godLvl === 1) mult *= 1.15;
		else if (godLvl === 2) mult *= 1.1;
		else if (godLvl === 3) mult *= 1.05;

		godLvl = CM.Sim.hasGod('ages');
		if (godLvl === 1) mult *= 1 + 0.15 * Math.sin((CM.Sim.DateAges / 1000 / (60 * 60 * 3)) * Math.PI * 2);
		else if (godLvl === 2) mult *= 1 + 0.15 * Math.sin((CM.Sim.DateAges / 1000 / (60 * 60 * 12)) * Math.PI * 2);
		else if (godLvl === 3) mult *= 1 + 0.15 * Math.sin((CM.Sim.DateAges / 1000 / (60 * 60 * 24)) * Math.PI * 2);

		godLvl = CM.Sim.hasGod('decadence');
		if (godLvl === 1) buildMult *= 0.93;
		else if (godLvl === 2) buildMult *= 0.95;
		else if (godLvl === 3) buildMult *= 0.98;

		godLvl = CM.Sim.hasGod('industry');
		if (godLvl === 1) buildMult *= 1.1;
		else if (godLvl === 2) buildMult *= 1.06;
		else if (godLvl === 3) buildMult *= 1.03;

		godLvl = CM.Sim.hasGod('labor');
		if (godLvl === 1) buildMult *= 0.97;
		else if (godLvl === 2) buildMult *= 0.98;
		else if (godLvl === 3) buildMult *= 0.99;
	}

	if (CM.Sim.Has('Santa\'s legacy')) mult *= 1 + (Game.santaLevel + 1) * 0.03;

	const milkProgress = CM.Sim.AchievementsOwned / 25;
	let milkMult = 1;
	if (CM.Sim.Has('Santa\'s milk and cookies')) milkMult *= 1.05;
	// if (CM.Sim.hasAura('Breath of Milk')) milkMult *= 1.05;
	milkMult *= 1 + CM.Sim.auraMult('Breath of Milk') * 0.05;
	if (CM.Sim.hasGod) {
		const godLvl = CM.Sim.hasGod('mother');
		if (godLvl === 1) milkMult *= 1.1;
		else if (godLvl === 2) milkMult *= 1.05;
		else if (godLvl === 3) milkMult *= 1.03;
	}
	milkMult *= CM.Sim.eff('milk');

	let catMult = 1;

	if (CM.Sim.Has('Kitten helpers'))		catMult *= (1 + milkProgress * 0.1 * milkMult);
	if (CM.Sim.Has('Kitten workers'))		catMult *= (1 + milkProgress * 0.125 * milkMult);
	if (CM.Sim.Has('Kitten engineers')) 	catMult *= (1 + milkProgress * 0.15 * milkMult);
	if (CM.Sim.Has('Kitten overseers'))		catMult *= (1 + milkProgress * 0.175 * milkMult);
	if (CM.Sim.Has('Kitten managers'))		catMult *= (1 + milkProgress * 0.2 * milkMult);
	if (CM.Sim.Has('Kitten accountants'))	catMult *= (1 + milkProgress * 0.2 * milkMult);
	if (CM.Sim.Has('Kitten specialists'))	catMult *= (1 + milkProgress * 0.2 * milkMult);
	if (CM.Sim.Has('Kitten experts'))		catMult *= (1 + milkProgress * 0.2 * milkMult);
	if (CM.Sim.Has('Kitten consultants'))	catMult *= (1 + milkProgress * 0.2 * milkMult);
	if (CM.Sim.Has('Kitten assistants to the regional manager')) catMult *= (1 + milkProgress * 0.175 * milkMult);
	if (CM.Sim.Has('Kitten marketeers')) 	catMult *= (1 + milkProgress * 0.15 * milkMult);
	if (CM.Sim.Has('Kitten analysts')) 		catMult *= (1 + milkProgress * 0.125 * milkMult);
	if (CM.Sim.Has('Kitten executives')) 	catMult *= (1 + milkProgress * 0.115 * milkMult);
	if (CM.Sim.Has('Kitten admins')) 		catMult *= (1 + milkProgress * 0.11 * milkMult);
	if (CM.Sim.Has('Kitten strategists')) 	catMult *= (1 + milkProgress * 0.105 * milkMult);
	if (CM.Sim.Has('Kitten angels')) 		catMult *= (1 + milkProgress * 0.1 * milkMult);
	if (CM.Sim.Has('Fortune #103')) 		catMult *= (1 + milkProgress * 0.05 * milkMult);

	for (const i of Object.keys(CM.Sim.Objects)) {
		const me = CM.Sim.Objects[i];
		let storedCps = me.cps(me);
		if (Game.ascensionMode !== 1) storedCps *= (1 + me.level * 0.01) * buildMult;
		if (me.name === 'Grandma' && CM.Sim.Has('Milkhelp&reg; lactose intolerance relief tablets')) storedCps *= 1 + 0.05 * milkProgress * milkMult;
		CM.Sim.cookiesPs += me.amount * storedCps;
	}

	if (CM.Sim.Has('"egg"')) CM.Sim.cookiesPs += 9;// "egg"

	mult *= catMult;

	let eggMult = 1;
	if (CM.Sim.Has('Chicken egg')) eggMult *= 1.01;
	if (CM.Sim.Has('Duck egg')) eggMult *= 1.01;
	if (CM.Sim.Has('Turkey egg')) eggMult *= 1.01;
	if (CM.Sim.Has('Quail egg')) eggMult *= 1.01;
	if (CM.Sim.Has('Robin egg')) eggMult *= 1.01;
	if (CM.Sim.Has('Ostrich egg')) eggMult *= 1.01;
	if (CM.Sim.Has('Cassowary egg')) eggMult *= 1.01;
	if (CM.Sim.Has('Salmon roe')) eggMult *= 1.01;
	if (CM.Sim.Has('Frogspawn')) eggMult *= 1.01;
	if (CM.Sim.Has('Shark egg')) eggMult *= 1.01;
	if (CM.Sim.Has('Turtle egg')) eggMult *= 1.01;
	if (CM.Sim.Has('Ant larva')) eggMult *= 1.01;
	if (CM.Sim.Has('Century egg')) {
		// The boost increases a little every day, with diminishing returns up to +10% on the 100th day
		let day = Math.floor((CM.Sim.DateCentury - Game.startDate) / 1000 / 10) * 10 / 60 / 60 / 24;
		day = Math.min(day, 100);
		// Sets a Cache value to be displayed in the Stats page, could be moved...
		CM.Cache.CentEgg = 1 + (1 - (1 - day / 100) ** 3) * 0.1;
		eggMult *= CM.Cache.CentEgg;
	}
	mult *= eggMult;

	if (CM.Sim.Has('Sugar baking')) mult *= (1 + Math.min(100, Game.lumps) * 0.01);

	// if (CM.Sim.hasAura('Radiant Appetite')) mult *= 2;
	mult *= 1 + CM.Sim.auraMult('Radiant Appetite');

	const rawCookiesPs = CM.Sim.cookiesPs * mult;
	for (const i of Object.keys(Game.CpsAchievements)) {
		if (rawCookiesPs >= Game.CpsAchievements[i].threshold) CM.Sim.Win(Game.CpsAchievements[i].name);
	}

	CM.Sim.cookiesPsRaw = rawCookiesPs;

	const n = Game.shimmerTypes.golden.n;
	const auraMult = CM.Sim.auraMult('Dragon\'s Fortune');
	for (let i = 0; i < n; i++) {
		mult *= 1 + auraMult * 1.23;
	}

	const name = Game.bakeryName.toLowerCase();
	if (name === 'orteil') mult *= 0.99;
	else if (name === 'ortiel') mult *= 0.98;

	if (CM.Sim.Has('Elder Covenant')) mult *= 0.95;

	if (CM.Sim.Has('Golden switch [off]')) {
		let goldenSwitchMult = 1.5;
		if (CM.Sim.Has('Residual luck')) {
			const upgrades = Game.goldenCookieUpgrades;
			for (const i of Object.keys(upgrades)) {
				if (CM.Sim.Has(upgrades[i])) goldenSwitchMult += 0.1;
			}
		}
		mult *= goldenSwitchMult;
	}
	if (CM.Sim.Has('Shimmering veil [off]')) {
		let veilMult = 0.5;
		if (CM.Sim.Has('Reinforced membrane')) veilMult += 0.1;
		if (CM.Sim.Has('Delicate touch')) veilMult += 0.05;
		if (CM.Sim.Has('Steadfast murmur')) veilMult += 0.05;
		if (CM.Sim.Has('Glittering edge')) veilMult += 0.05;
		mult *= 1 + veilMult;
	}

	if (CM.Sim.Has('Magic shenanigans')) mult *= 1000;
	if (CM.Sim.Has('Occult obstruction')) mult *= 0;

	CM.Sim.cookiesPs = Game.runModHookOnValue('cps', CM.Sim.cookiesPs);

	mult *= CM.Cache.getCPSBuffMult();

	CM.Sim.cookiesPs *= mult;

	// if (Game.hasBuff('Cursed finger')) Game.cookiesPs = 0;
};

/**
 * This function calculates if any special achievements have been obtained
 * If so it CM.Sim.Win()'s them and the caller function will know to recall CM.Sim.CalculateGains()
 * It is called at the end of any functions that simulates certain behaviour
 */
CM.Sim.CheckOtherAchiev = function () {
	let grandmas = 0;
	for (const i of Object.keys(Game.GrandmaSynergies)) {
		if (CM.Sim.Has(Game.GrandmaSynergies[i])) grandmas++;
	}
	if (!CM.Sim.HasAchiev('Elder') && grandmas >= 7) CM.Sim.Win('Elder');
	if (!CM.Sim.HasAchiev('Veteran') && grandmas >= 14) CM.Sim.Win('Veteran');

	let buildingsOwned = 0;
	let mathematician = 1;
	let base10 = 1;
	let minAmount = 100000;
	for (const i of Object.keys(CM.Sim.Objects)) {
		buildingsOwned += CM.Sim.Objects[i].amount;
		minAmount = Math.min(CM.Sim.Objects[i].amount, minAmount);
		if (!CM.Sim.HasAchiev('Mathematician')) {
			if (CM.Sim.Objects[i].amount < Math.min(128, 2 ** ((Game.ObjectsById.length - Game.Objects[i].id) - 1))) mathematician = 0;
		}
		if (!CM.Sim.HasAchiev('Base 10')) {
			if (CM.Sim.Objects[i].amount < (Game.ObjectsById.length - Game.Objects[i].id) * 10) base10 = 0;
		}
	}
	if (minAmount >= 1) CM.Sim.Win('One with everything');
	if (mathematician === 1) CM.Sim.Win('Mathematician');
	if (base10 === 1) CM.Sim.Win('Base 10');
	if (minAmount >= 100) CM.Sim.Win('Centennial');
	if (minAmount >= 150) CM.Sim.Win('Centennial and a half');
	if (minAmount >= 200) CM.Sim.Win('Bicentennial');
	if (minAmount >= 250) CM.Sim.Win('Bicentennial and a half');
	if (minAmount >= 300) CM.Sim.Win('Tricentennial');
	if (minAmount >= 350) CM.Sim.Win('Tricentennial and a half');
	if (minAmount >= 400) CM.Sim.Win('Quadricentennial');
	if (minAmount >= 450) CM.Sim.Win('Quadricentennial and a half');
	if (minAmount >= 500) CM.Sim.Win('Quincentennial');
	if (minAmount >= 550) CM.Sim.Win('Quincentennial and a half');
	if (minAmount >= 600) CM.Sim.Win('Sexcentennial');
	if (minAmount >= 650) CM.Sim.Win('Sexcentennial and a half');
	if (minAmount >= 700) CM.Sim.Win('Septcentennial');

	if (buildingsOwned >= 100) CM.Sim.Win('Builder');
	if (buildingsOwned >= 500) CM.Sim.Win('Architect');
	if (buildingsOwned >= 1000) CM.Sim.Win('Engineer');
	if (buildingsOwned >= 2000) CM.Sim.Win('Lord of Constructs');
	if (buildingsOwned >= 4000) CM.Sim.Win('Grand design');
	if (buildingsOwned >= 8000) CM.Sim.Win('Ecumenopolis');
	if (buildingsOwned >= 10000) CM.Sim.Win('Myriad');

	if (CM.Sim.UpgradesOwned >= 20) CM.Sim.Win('Enhancer');
	if (CM.Sim.UpgradesOwned >= 50) CM.Sim.Win('Augmenter');
	if (CM.Sim.UpgradesOwned >= 100) CM.Sim.Win('Upgrader');
	if (CM.Sim.UpgradesOwned >= 200) CM.Sim.Win('Lord of Progress');
	if (CM.Sim.UpgradesOwned >= 300) CM.Sim.Win('The full picture');
	if (CM.Sim.UpgradesOwned >= 400) CM.Sim.Win('When there\'s nothing left to add');
	if (CM.Sim.UpgradesOwned >= 500) CM.Sim.Win('Kaizen');
	if (CM.Sim.UpgradesOwned >= 600) CM.Sim.Win('Beyond quality');
	if (CM.Sim.UpgradesOwned >= 700) CM.Sim.Win("Oft we mar what's well");

	if (buildingsOwned >= 4000 && CM.Sim.UpgradesOwned >= 300) CM.Sim.Win('Polymath');
	if (buildingsOwned >= 8000 && CM.Sim.UpgradesOwned >= 400) CM.Sim.Win('Renaissance baker');

	if (CM.Sim.Objects.Cursor.amount + CM.Sim.Objects.Grandma.amount >= 777) CM.Sim.Win('The elder scrolls');

	let hasAllHalloCook = true;
	for (const i of Object.keys(CM.Data.HalloCookies)) {
		if (!CM.Sim.Has(CM.Data.HalloCookies[i])) hasAllHalloCook = false;
	}
	if (hasAllHalloCook) CM.Sim.Win('Spooky cookies');

	let hasAllChristCook = true;
	for (const i of Object.keys(CM.Data.ChristCookies)) {
		if (!CM.Sim.Has(CM.Data.ChristCookies[i])) hasAllChristCook = false;
	}
	if (hasAllChristCook) CM.Sim.Win('Let it snow');

	if (CM.Sim.Has('Fortune cookies')) {
		const list = Game.Tiers.fortune.upgrades;
		let fortunes = 0;
		for (const i of Object.keys(list)) {
			if (CM.Sim.Has(list[i].name)) fortunes++;
		}
		if (fortunes >= list.length) CM.Sim.Win('O Fortuna');
	}
};

/**
 * This function calculates CPS without the Golden Switch
 * It is called by CM.Cache.NoGoldSwitchCPS()
 */
CM.Sim.NoGoldSwitchCPS = function () {
	CM.Sim.CopyData();
	CM.Sim.Upgrades['Golden switch [off]'].bought = 0;
	CM.Sim.CalculateGains();
	return CM.Sim.cookiesPs;
};

/**
 * Section: Functions related to calculating Bonus Income */

/**
 * This function calculates the bonus income of buying a building
 * It is called by CM.Cache.CacheBuildingIncome()
 * @param	{string}	building	The name of the building to be bought
 * @param	{number}	amount		The amount to be bought
 * @returns {number}				The bonus income of the building
 */
CM.Sim.BuyBuildingsBonusIncome = function (building, amount) {
	CM.Sim.CopyData();
	const me = CM.Sim.Objects[building];
	me.amount += amount;

	if (building === 'Cursor') {
		if (me.amount >= 1) CM.Sim.Win('Click');
		if (me.amount >= 2) CM.Sim.Win('Double-click');
		if (me.amount >= 50) CM.Sim.Win('Mouse wheel');
		if (me.amount >= 100) CM.Sim.Win('Of Mice and Men');
		if (me.amount >= 200) CM.Sim.Win('The Digital');
		if (me.amount >= 300) CM.Sim.Win('Extreme polydactyly');
		if (me.amount >= 400) CM.Sim.Win('Dr. T');
		if (me.amount >= 500) CM.Sim.Win('Thumbs, phalanges, metacarpals');
		if (me.amount >= 600) CM.Sim.Win('With her finger and her thumb');
		if (me.amount >= 700) CM.Sim.Win('Gotta hand it to you');
		if (me.amount >= 800) CM.Sim.Win('The devil\'s workshop');
		if (me.amount >= 900) CM.Sim.Win('All on deck');
		if (me.amount >= 1000) CM.Sim.Win('A round of applause');
	} else {
		for (const j in Game.Objects[me.name].tieredAchievs) {
			if (me.amount >= Game.Tiers[Game.Objects[me.name].tieredAchievs[j].tier].achievUnlock) {
				CM.Sim.Win(Game.Objects[me.name].tieredAchievs[j].name);
			}
		}
	}
	
	const lastAchievementsOwned = CM.Sim.AchievementsOwned;

	CM.Sim.CalculateGains();
	
	CM.Sim.CheckOtherAchiev();

	if (lastAchievementsOwned !== CM.Sim.AchievementsOwned) {
		CM.Sim.CalculateGains();
	}
	
	return CM.Sim.cookiesPs - Game.cookiesPs;
};

/**
 * This function calculates the bonus income of buying a building
 * It is called by CM.Cache.CacheBuildingIncome()
 * @param	{string}				building	The name of the upgrade to be bought
 * @returns {[{number, number}]}				The bonus income of the upgrade and the difference in MouseCPS
 */
CM.Sim.BuyUpgradesBonusIncome = function (upgrade) {
	if (Game.Upgrades[upgrade].pool === 'toggle' || (Game.Upgrades[upgrade].bought === 0 && Game.Upgrades[upgrade].unlocked && Game.Upgrades[upgrade].pool !== 'prestige')) {
		CM.Sim.CopyData();
		const me = CM.Sim.Upgrades[upgrade];
		//me.bought = 1;  //original CM code
		
		if (CM.Sim.Upgrades[upgrade].name === 'Shimmering veil [on]') {
			CM.Sim.Upgrades['Shimmering veil [off]'].bought = 0;
		} else if (CM.Sim.Upgrades[upgrade].name === 'Golden switch [on]') {
			CM.Sim.Upgrades['Golden switch [off]'].bought = 0;
		} else {
			CM.Sim.Upgrades[upgrade].bought = (CM.Sim.Upgrades[upgrade].bought + 1) % 2;
		}
		
		if (Game.CountsAsUpgradeOwned(Game.Upgrades[upgrade].pool)) CM.Sim.UpgradesOwned++;

		if (upgrade === 'Elder Pledge') {
			CM.Sim.pledges++;
			if (CM.Sim.pledges > 0) CM.Sim.Win('Elder nap');
			if (CM.Sim.pledges >= 5) CM.Sim.Win('Elder slumber');
		} else if (upgrade === 'Elder Covenant') {
			CM.Sim.Win('Elder calm');
		} else if (upgrade === 'Prism heart biscuits') {
			CM.Sim.Win('Lovely cookies');
		} else if (upgrade === 'Heavenly key') {
			CM.Sim.Win('Wholesome');
		}

		const lastAchievementsOwned = CM.Sim.AchievementsOwned;

		CM.Sim.CalculateGains();

		CM.Sim.CheckOtherAchiev();

		if (lastAchievementsOwned !== CM.Sim.AchievementsOwned) {
			CM.Sim.CalculateGains();
		}

		const diffMouseCPS = CM.Sim.mouseCps() - Game.computedMouseCps;
		if (diffMouseCPS) {
			return [CM.Sim.cookiesPs - Game.cookiesPs, diffMouseCPS];
		}
		return [CM.Sim.cookiesPs - Game.cookiesPs];
	} else {
		return [];
	}
};

/**
 * This function calculates the cookies per click
 * It is called by CM.Sim.BuyUpgradesBonusIncome() when an upgrades has no bonus-income (and is thus a clicking-upgrade)
 * @returns	{number}	out	The clicking power
 */
CM.Sim.mouseCps = function () {
	let add = 0;
	if (CM.Sim.Has('Thousand fingers')) add += 0.1;
	if (CM.Sim.Has('Million fingers')) add *= 5;
	if (CM.Sim.Has('Billion fingers')) add *= 10;
	if (CM.Sim.Has('Trillion fingers')) add *= 20;
	if (CM.Sim.Has('Quadrillion fingers')) add *= 20;
	if (CM.Sim.Has('Quintillion fingers')) add *= 20;
	if (CM.Sim.Has('Sextillion fingers')) add *= 20;
	if (CM.Sim.Has('Septillion fingers')) add *= 20;
	if (CM.Sim.Has('Octillion fingers')) add *= 20;
	if (CM.Sim.Has('Nonillion fingers')) add *= 20;
	if (CM.Sim.Has('Decillion fingers')) add *= 20;
	if (CM.Sim.Has('Undecillion fingers')) add *= 20;
	if (CM.Sim.Has('Unshackled cursors')) add *= 25;
	let num = 0;
	for (const i of Object.keys(CM.Sim.Objects)) { num += CM.Sim.Objects[i].amount; }
	num -= CM.Sim.Objects.Cursor.amount;
	add *= num;

	// Can use CM.Sim.cookiesPs as function is always called after CM.Sim.CalculateGains()
	if (CM.Sim.Has('Plastic mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Iron mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Titanium mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Adamantium mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Unobtainium mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Eludium mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Wishalloy mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Fantasteel mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Nevercrack mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Armythril mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Technobsidian mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Plasmarble mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Miraculite mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Aetherice mouse')) add += CM.Sim.cookiesPs * 0.01;
	if (CM.Sim.Has('Omniplast mouse')) add += CM.Sim.cookiesPs * 0.01;

	if (CM.Sim.Has('Fortune #104')) add += CM.Sim.cookiesPs * 0.01;

	let mult = 1;
	if (CM.Sim.Has('Santa\'s helpers')) mult *= 1.1;
	if (CM.Sim.Has('Cookie egg')) mult *= 1.1;
	if (CM.Sim.Has('Halo gloves')) mult *= 1.1;
	if (CM.Sim.Has('Dragon claw')) mult *= 1.03;

	if (CM.Sim.Has('Aura gloves')) {
		mult *= 1 + 0.05 * Math.min(Game.Objects.Cursor.level, CM.Sim.Has('Luminous gloves') ? 20 : 10);
	}

	mult *= CM.Sim.eff('click');
	if (CM.Sim.Objects.Temple.minigameLoaded) {
		if (CM.Sim.hasGod) {
			const godLvl = CM.Sim.hasGod('labor');
			if (godLvl === 1) mult *= 1.15;
			else if (godLvl === 2) mult *= 1.1;
			else if (godLvl === 3) mult *= 1.05;
		}
	}

	for (const i of Object.keys(Game.buffs)) {
		if (typeof Game.buffs[i].multClick !== 'undefined') mult *= Game.buffs[i].multClick;
	}

	// if (CM.Sim.auraMult('Dragon Cursor')) mult*=1.05;
	mult *= 1 + CM.Sim.auraMult('Dragon Cursor') * 0.05;

	// No need to make this function a CM function
	let out = mult * Game.ComputeCps(1, CM.Sim.Has('Reinforced index finger') + CM.Sim.Has('Carpal tunnel prevention cream') + CM.Sim.Has('Ambidextrous'), add);

	out = Game.runModHookOnValue('cookiesPerClick', out);

	if (Game.hasBuff('Cursed finger')) out = Game.buffs['Cursed finger'].power;

	return out;
};

/**
 * Section: Functions related to calculating the effect of changing Dragon Aura */

/**
 * This functions calculates the cps and cost of changing a Dragon Aura
 * It is called by CM.Disp.AddAuraInfo()
 * @param	{number}			aura										The number of the aura currently selected by the mouse/user
 * @returns {[number, number]} 	[CM.Sim.cookiesPs - Game.cookiesPs, price]	The bonus cps and the price of the change
 */
CM.Sim.CalculateChangeAura = function (aura) {
	CM.Sim.CopyData();

	// Check if aura being changed is first or second aura
	const auraToBeChanged = l('promptContent').children[0].innerHTML.includes('secondary');
	if (auraToBeChanged) CM.Sim.dragonAura2 = aura;
	else CM.Sim.dragonAura = aura;

	// Sell highest building but only if aura is different
	let price = 0;
	if (CM.Sim.dragonAura !== CM.Cache.dragonAura || CM.Sim.dragonAura2 !== CM.Cache.dragonAura2) {
		for (let i = Game.ObjectsById.length - 1; i > -1; --i) {
			if (Game.ObjectsById[i].amount > 0) {
				const highestBuilding = CM.Sim.Objects[Game.ObjectsById[i].name].name;
				CM.Sim.Objects[highestBuilding].amount -= 1;
				CM.Sim.buildingsOwned -= 1;
				price = CM.Sim.Objects[highestBuilding].basePrice * Game.priceIncrease ** Math.max(0, CM.Sim.Objects[highestBuilding].amount - 1 - CM.Sim.Objects[highestBuilding].free);
				price = Game.modifyBuildingPrice(CM.Sim.Objects[highestBuilding], price);
				price = Math.ceil(price);
				break;
			}
		}
	}

	const lastAchievementsOwned = CM.Sim.AchievementsOwned;
	CM.Sim.CalculateGains();

	CM.Sim.CheckOtherAchiev();
	if (lastAchievementsOwned !== CM.Sim.AchievementsOwned) {
		CM.Sim.CalculateGains();
	}
	return [CM.Sim.cookiesPs - Game.cookiesPs, price];
};

/**
 * Section: Functions related to calculating the reset bonus */

/**
 * This function calculates the cookies per click difference betwene current and after a ascension
 * It is called by CM.Disp.CreateStatsPrestigeSection()
 * @param	{number}	newHeavenlyChips	The total heavenly chips after ascension
 * @returns	{number}	ResetCPS			The CPS difference after reset
 */
CM.Sim.ResetBonus = function (newHeavenlyChips) {
	// Calculate CPS with all Heavenly upgrades
	let curCPS = Game.cookiesPs;

	CM.Sim.CopyData();

	if (CM.Sim.Upgrades['Heavenly key'].bought === 0) {
		CM.Sim.Upgrades['Heavenly chip secret'].bought = 1;
		CM.Sim.Upgrades['Heavenly cookie stand'].bought = 1;
		CM.Sim.Upgrades['Heavenly bakery'].bought = 1;
		CM.Sim.Upgrades['Heavenly confectionery'].bought = 1;
		CM.Sim.Upgrades['Heavenly key'].bought = 1;

		CM.Sim.CalculateGains();

		curCPS = CM.Sim.cookiesPs;

		CM.Sim.CopyData();
	}

	if (CM.Cache.RealCookiesEarned >= 1000000) CM.Sim.Win('Sacrifice');
	if (CM.Cache.RealCookiesEarned >= 1000000000) CM.Sim.Win('Oblivion');
	if (CM.Cache.RealCookiesEarned >= 1000000000000) CM.Sim.Win('From scratch');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000) CM.Sim.Win('Nihilism');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000) CM.Sim.Win('Dematerialize');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000) CM.Sim.Win('Nil zero zilch');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000) CM.Sim.Win('Transcendence');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000) CM.Sim.Win('Obliterate');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000000) CM.Sim.Win('Negative void');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000000000) CM.Sim.Win('To crumbs, you say?');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000000000000) CM.Sim.Win('You get nothing');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000000000000000) CM.Sim.Win('Humble rebeginnings');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000000000000000000) CM.Sim.Win('The end of the world');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000000000000000000000) CM.Sim.Win('Oh, you\'re back');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000000000000000000000000) CM.Sim.Win('Lazarus');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000000000000000000000000000) CM.Sim.Win('Smurf account');
	if (CM.Cache.RealCookiesEarned >= 1000000000000000000000000000000000000000000000000000000) CM.Sim.Win('If at first you don\'t succeed');

	CM.Sim.Upgrades['Heavenly chip secret'].bought = 1;
	CM.Sim.Upgrades['Heavenly cookie stand'].bought = 1;
	CM.Sim.Upgrades['Heavenly bakery'].bought = 1;
	CM.Sim.Upgrades['Heavenly confectionery'].bought = 1;
	CM.Sim.Upgrades['Heavenly key'].bought = 1;

	CM.Sim.prestige = newHeavenlyChips;

	const lastAchievementsOwned = CM.Sim.AchievementsOwned;

	CM.Sim.CalculateGains();

	CM.Sim.CheckOtherAchiev();

	if (lastAchievementsOwned !== CM.Sim.AchievementsOwned) {
		CM.Sim.CalculateGains();
	}

	const ResetCPS = CM.Sim.cookiesPs - curCPS;

	// Reset Pretige level after calculation as it is used in CM.Sim.CalculateGains() so can't be local
	CM.Sim.prestige = Game.prestige;

	return ResetCPS;
};

/**
 * Section: Functions related to selling builings before buying the chocolate egg */

/**
 * This function calculates the maximum cookies obtained from selling buildings just before purchasing the chocolate egg
 * It is called by CM.Cache.CacheSellForChoEgg()
 * @returns	{number}	sellTotal	The maximum cookies to be earned
 */
CM.Sim.SellBuildingsForChoEgg = function () {
	let sellTotal = 0;

	CM.Sim.CopyData();

	// Change auras to Earth Shatterer + Reality bending to optimize money made by selling
	let buildingsToSacrifice = 2;
	if (CM.Sim.dragonAura === 5 || CM.Sim.dragonAura === 18) {
		--buildingsToSacrifice;
	}
	if (CM.Sim.dragonAura2 === 5 || CM.Sim.dragonAura2 === 18) {
		--buildingsToSacrifice;
	}
	CM.Sim.dragonAura = 5;
	CM.Sim.dragonAura2 = 18;

	// Sacrifice highest buildings for the aura switch
	for (let i = 0; i < buildingsToSacrifice; ++i) {
		let highestBuilding = 0;
		for (const j in CM.Sim.Objects) {
			if (CM.Sim.Objects[j].amount > 0) {
				highestBuilding = CM.Sim.Objects[j];
			}
		}
		highestBuilding.amount--;
		CM.Sim.buildingsOwned--;
	}

	// Get money made by selling all remaining buildings
	for (const i of Object.keys(CM.Sim.Objects)) {
		const me = CM.Sim.Objects[i];
		sellTotal += CM.Sim.BuildingSell(Game.Objects[me.name], Game.Objects[i].basePrice, me.amount, Game.Objects[i].free, me.amount);
	}

	return sellTotal;
};
/**
 * Footer *
 */

/**
 * Section: Functions related to base game modding API */

/**
 * This register a init function to the CM object. Per Game code/comments:
 * "this function is called as soon as the mod is registered
 * declare hooks here"
 * It starts the further initialization of CookieMonster and registers hooks
 */
CM.init = function () {
	CM.Footer.isInitzializing = true;
	let proceed = true;
	if (Game.version !== Number(CM.VersionMajor)) {
		proceed = confirm(`Cookie Monster version ${CM.VersionMajor}.${CM.VersionMinor} is meant for Game version ${CM.VersionMajor}.  Loading a different version may cause errors.  Do you still want to load Cookie Monster?`);
	}
	if (proceed) {
		CM.Main.DelayInit();
		Game.registerHook('draw', CM.Disp.Draw);
		Game.registerHook('logic', CM.Main.Loop);
		CM.Footer.isInitzializing = false;
	}
};

/**
 * This registers a save function to the CM object. Per Game code/comments:
 * "use this to store persistent data associated with your mod
 * return 'a string to be saved';"
 */
CM.save = function () {
	return JSON.stringify({
		settings: CM.Options,
		version: `${CM.VersionMajor}.${CM.VersionMinor}`,
	});
};

/**
 * This registers a load function to the CM object. Per Game code/comments:
 * "do stuff with the string data you saved previously"
 */
CM.load = function (str) {
	const save = JSON.parse(str);
	CM.Config.LoadConfig(save.settings);
	if (save.version !== `${CM.VersionMajor}.${CM.VersionMinor}`) {
		if (Game.prefs.popups) Game.Popup('A new version of Cookie Monster has been loaded, check out the release notes in the info tab!');
		else Game.Notify('A new version of Cookie Monster has been loaded, check out the release notes in the info tab!', '', '', 0, 1);
	}
};

/**
 * Section: Functions related to the initialization of CookieMonster */

/**
 * This functions loads an external script (on the same repository) that creates the
 * functionality needed to dynamiccaly change colours
 * It is called by the last function in the footer
 */
CM.Footer.AddJscolor = function () {
	CM.Footer.Jscolor = document.createElement('script');
	CM.Footer.Jscolor.type = 'text/javascript';
	CM.Footer.Jscolor.setAttribute('src', 'https://iasinme.github.io/Cookie-Clicker-AI/jscolor/jscolor.js');
	document.head.appendChild(CM.Footer.Jscolor);
};

/**
 * This functions starts the initizialization and register CookieMonster
 * It is called as the last function in this script's execution
 */
if (typeof CM.Footer.isInitzializing === 'undefined') {
	CM.Footer.AddJscolor();
	const delay = setInterval(function () {
		if (typeof jscolor !== 'undefined') {
			jscolor.init();
			Game.registerMod('CookieMonster', CM);
			clearInterval(delay);
		}
	}, 500);
}
