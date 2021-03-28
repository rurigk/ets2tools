const fs = require('fs');
const path = require('path')
const inquirer = require('inquirer');
const platformFolders = require('platform-folders');
const { exec } = require('child_process');
const SiiParser = require('./SiiParser/Sii.js');

try{fs.mkdirSync('Export/Cargo');}catch(e){}

try{fs.mkdirSync('Export/GPS');}catch(e){}

try{fs.mkdirSync('Import/Cargo');}catch(e){}

try{fs.mkdirSync('Import/GPS');}catch(e){}

var SiiNunit;
var NamelessList = [];
var NamelessCounter = 4096;

var status = {
	profile: '',
	save: '',
	savePath: ''
}

var cargos = JSON.parse(fs.readFileSync('./Data/Cargo.json').toString());
var cityCompany = JSON.parse(fs.readFileSync('./Data/CityCompany.json').toString());
var trailerVariants = JSON.parse(fs.readFileSync('./Data/TrailerVariants.json').toString());
var cityTargets = JSON.parse(fs.readFileSync('./Data/CityTargets.json').toString());

const docsDir = platformFolders.getDocumentsFolder();
const profilesPath = path.join(docsDir, 'Euro Truck Simulator 2', 'profiles');
function GetProfiles(){
	try{
		SelectProfile(profilesPath);
	}catch(e)
	{
		console.log('No profiles founded');
	}
}

function SelectProfile(profiles)
{
	var profiles = fs.readdirSync(profilesPath);
	inquirer.prompt([
		{
			type: 'list',
			name: 'profile',
			message: 'Select a profile',
			choices: profiles,
			pageSize: 25
		}
	])
	.then(answers => {
		status.profile = answers.profile;
		let savesPath = path.join(docsDir, 'Euro Truck Simulator 2', 'profiles', answers.profile, 'save');
		try{
			SelectSave(savesPath);
		}catch(e)
		{
			console.log('No saves founded');
		}
	});
}

function SelectSave(savesPath)
{
	var saves = fs.readdirSync(savesPath);
	for(var i = saves.length-1; i >= 0; i--)
	{
		if(saves[i].indexOf('autosave') >= 0){
			saves.splice(i,1);
		}
	}
	inquirer.prompt([
		{
			type: 'list',
			name: 'save',
			message: 'Select a save',
			choices: saves,
			pageSize: 25
		}
	])
	.then(answers => {
		status.save = answers.save;
		let savePath = path.join(savesPath,answers.save, 'game.sii');
		LoadSaveSubroutine(savePath)
	});
}

function LoadSaveSubroutine(savePath)
{
	try{
		status.savePath = savePath;
		var siiString = fs.readFileSync(savePath).toString();

		if(siiString.slice(0, 8) != 'SiiNunit'){
			exec(`SII_Decrypt.exe "${savePath}"`, (error, stdout, stderr) => {
				if (error) {
					console.error(`SII_Decrypt.exe missing`, error);
					return;
				}

				setTimeout(() => {
					LoadSave(savePath);
				}, 200);
			});
		}
		else
		{
			LoadSave(savePath);
		}
	}catch(e)
	{
		console.log('Error loading the save');
	}
}

function LoadSave(savePath)
{
	var siiString = fs.readFileSync(savePath).toString();
	SiiNunit = SiiParser.Sii.Parse(siiString);

	ExtractNameless();
	GetMaxNamelessCount();

	ActionPrompt();
}

function ActionPrompt()
{
	inquirer.prompt([
		{
			type: 'list',
			name: 'action',
			message: 'What do you want to do?',
			choices: [
				'Change assigned trailer',
				'Generate cargo',
				'Import cargo',
				'Export GPS',
				'Import GPS'
			],
			pageSize: 25
		}
	])
	.then(answers => {
		switch(answers.action)
		{
			case 'Change assigned trailer':
				ChangeAssignedTrailerRoutine();
				break;
			case 'Generate cargo':
				GenerateCargoRoutine();
				break;
			case 'Import cargo':
				ImportCargoRoutine();
				break;
			case 'Export GPS':
				ExportGPSRoutine();
				break;
			case 'Import GPS':
				ImportGPSRoutine();
				break;
			default:
				console.log('Unknown action')
		}
	});
}

function ExtractNameless()
{
	for(var key in SiiNunit)
	{
		var ids = Object.keys(SiiNunit[key]);
		for (let i = 0; i < ids.length; i++) {
			if(ids[i].indexOf('_nameless.fff.9999') >= 0)
			{
				NamelessList.push(ids[i]);
			}
		}
	}
}

function GetMaxNamelessCount()
{
	for (let i = 0; i < NamelessList.length; i++) {
		const nameless = NamelessList[i].split('.');
		let currentID = parseInt(nameless[3], 16);
		if(currentID > NamelessCounter)
		{
			NamelessCounter = currentID;
		}
	}
}

function GenerateNameless()
{
	let nameless = `_nameless.fff.9999.${NamelessCounter.toString(16)}`;
	NamelessCounter += 1;
	return nameless;
}

function ChangeAssignedTrailerRoutine()
{
	var player = Object.keys(SiiNunit.player)[0];
	var currentTrailer = SiiNunit.player[player]['assigned_trailer'];

	if(currentTrailer == null)
	{
		console.log('No trailer attached');
		WaitAndDie();
		return;
	}
	var playerTrailers = SiiNunit.player[player]['trailers'];
	var trailers = [];
	for (let i = 0; i < playerTrailers.length; i++) {
		trailers.push(playerTrailers[i].toString());
	}
	inquirer.prompt([
		{
			type: 'rawlist',
			name: 'trailer',
			message: 'Select trailer',
			choices: trailers,
			pageSize: 25
		}
	])
	.then(answers => {
		SiiNunit.player[player]['assigned_trailer'] = new SiiParser.Token(answers.trailer);
		var serialized = SiiParser.Sii.Serialize(SiiNunit);
		fs.writeFileSync(status.savePath, serialized);
		console.log('Done!');
		WaitAndDie();
		//fs.writeFileSync('capture.json', JSON.stringify(SiiNunit));
	});	
}

function GenerateCargoRoutine()
{
	var cargoDetails = {
		origin_city: '',
		target_city: '',
		origin_company: '',
		target_company: '',
		cargo: '',
		trailer: ''
	}
	RequestRawList('Select origin city', Object.keys(cityCompany), (origin_city) => {
		cargoDetails.origin_city = origin_city;
		RequestRawList('Select origin company', Object.keys(cityCompany[origin_city].company), (origin_company) => {
			cargoDetails.origin_company = origin_company;
			RequestRawList('Select target city', Object.keys(cityCompany), (target_city) => {
				cargoDetails.target_city = target_city;
				RequestRawList('Select target company', Object.keys(cityCompany[target_city].company), (target_company) => {
					cargoDetails.target_company = target_company;
					RequestRawList('Select cargo', Object.keys(cargos), (cargo) => {
						cargoDetails.cargo = cargo;
						RequestRawList('Select trailer', cargos[cargo], (trailer) => {
							cargoDetails.trailer = trailer;
							GenerateCargo(cargoDetails, true);
							console.log('Done!');
							WaitAndDie();
						})
					})
				})
			})
		})
	})
	// Select city and list companies
	// Select first job related to that company anc modify job_offer_data
}

function GenerateCargo(details, exportsave)
{
	var cityCompany = SiiNunit.company[`company.volatile.${details.origin_company}.${details.origin_city}`];
	if(typeof cityCompany == 'undefined')
	{
		console.log('City not discovered');
		WaitAndDie();
		return;
	}

	if(cityCompany.job_offer.length == 0)
	{
		console.log('The company has no jobs to replace');
		WaitAndDie();
		return;
	}

	var economyKey = Object.keys(SiiNunit.economy)[0];
	var gameTime = SiiNunit.economy[economyKey].game_time
	
	var offerToken = cityCompany.job_offer[0].toString();
	SiiNunit.job_offer_data[offerToken].target = `${details.target_company}.${details.target_city}`;
	SiiNunit.job_offer_data[offerToken].cargo = new SiiParser.Token(`cargo.${details.cargo}`);
	SiiNunit.job_offer_data[offerToken].trailer_definition = new SiiParser.Token(details.trailer);
	SiiNunit.job_offer_data[offerToken].trailer_variant = new SiiParser.Token(trailerVariants[details.trailer][0]);
	SiiNunit.job_offer_data[offerToken].urgency = 0;
	SiiNunit.job_offer_data[offerToken].expiration_time = gameTime + 5000n;
	SiiNunit.job_offer_data[offerToken].units_count = 33;
	SiiNunit.job_offer_data[offerToken].shortest_distance_km = 0;
	SiiNunit.job_offer_data[offerToken].ferry_price = 0;
	SiiNunit.job_offer_data[offerToken].ferry_time = 0;

	if(typeof cityTargets[details.origin_city] != 'undefined' && typeof cityTargets[details.origin_city][details.target_city] != 'undefined')
	{
		let distance = cityTargets[details.origin_city][details.target_city].distance;
		let ferryPrice = cityTargets[details.origin_city][details.target_city].ferry;

		SiiNunit.job_offer_data[offerToken].shortest_distance_km = (distance < 0)? 0 : distance;
		SiiNunit.job_offer_data[offerToken].ferry_price = (ferryPrice < 0)? 0 : ferryPrice;
	}
	
	UpdateEconomyEventTime(`company.volatile.${details.origin_company}.${details.origin_city}`, 0n, gameTime + 5000n);

	var serialized = SiiParser.Sii.Serialize(SiiNunit);
	fs.writeFileSync(status.savePath, serialized);
	if(exportsave)
	{
		fs.writeFileSync(`./Export/Cargo/${details.origin_city}_${details.origin_company}-${details.target_city}_${details.target_company}-${details.cargo}.json`, JSON.stringify(details));
	}
}

function UpdateEconomyEventTime(unit_link, param, time)
{
	var nameless = null;
	for(var namelessEE in SiiNunit.economy_event)
	{
		if(SiiNunit.economy_event[namelessEE].unit_link.toString() == unit_link && SiiNunit.economy_event[namelessEE].param == param)
		{
			nameless = namelessEE;
			SiiNunit.economy_event[namelessEE].time = time;
		}
	}
	var firstEconomyQueue = Object.keys(SiiNunit.economy_event_queue)[0];
	for (let i = 0; i < SiiNunit.economy_event_queue[firstEconomyQueue].data.length; i++) {
		const element = SiiNunit.economy_event_queue[firstEconomyQueue].data[i];
		if(SiiNunit.economy_event_queue[firstEconomyQueue].data[i].toString() == nameless)
		{
			SiiNunit.economy_event_queue[firstEconomyQueue].data.splice(i,1);
			break;
		}
	}
	SiiNunit.economy_event_queue[firstEconomyQueue].data.push(new SiiParser.Token(nameless))
}
function ImportCargoRoutine()
{
	var cargos = fs.readdirSync('./Import/Cargo');
	for (let i = cargos.length - 1; i >= 0; i--) {
		if(cargos[i][0] == '.')
		{
			cargos.splice(i,1);
		}
	}
	if(cargos.length == 0)
	{
		console.log("No files to import");
		WaitAndDie();
		return;
	}
	inquirer.prompt([
		{
			type: 'list',
			name: 'cargos',
			message: 'Select a file to import',
			choices: cargos,
			pageSize: 25
		}
	])
	.then(answers => {
		try{
			let details = JSON.parse(fs.readFileSync(`./Import/Cargo/${answers.cargos}`));

			GenerateCargo(details, false);
			console.log('Done!');
			WaitAndDie();
		}catch(e)
		{
			console.log('Error loading the cargo')
		}
	});
}

function ExportGPSRoutine()
{
	var economyKey = Object.keys(SiiNunit.economy)[0];
	var waypointsBehind = SiiNunit.economy[economyKey]['stored_gps_behind_waypoints'];
	var waypointsAhead = SiiNunit.economy[economyKey]['stored_gps_ahead_waypoints'];

	var gps = {
		behind: [],
		ahead: []
	}

	for (let bi = 0; bi < waypointsBehind.length; bi++) {
		const nameless = waypointsBehind[bi];
		gps.behind.push({
			nav_node_position: SiiNunit.gps_waypoint_storage[nameless].nav_node_position,
			direction: SiiNunit.gps_waypoint_storage[nameless].direction
		});
	}

	for (let ai = 0; ai < waypointsAhead.length; ai++) {
		const nameless = waypointsAhead[ai];
		gps.ahead.push({
			nav_node_position: SiiNunit.gps_waypoint_storage[nameless].nav_node_position,
			direction: SiiNunit.gps_waypoint_storage[nameless].direction
		});
	}

	var d = new Date();
	fs.writeFileSync(`./Export/GPS/gps_${d.getDate()}-${d.getMonth()}-${d.getFullYear()}_${d.getTime()}.json`, JSON.stringify(gps));
	console.log('Done!');
	WaitAndDie();
}

function ImportGPSRoutine()
{
	var gps = fs.readdirSync('./Import/GPS');
	for (let i = gps.length - 1; i >= 0; i--) {
		if(gps[i][0] == '.')
		{
			gps.splice(i,1);
		}
	}
	if(gps.length == 0)
	{
		console.log("No files to import");
		WaitAndDie();
		return;
	}
	inquirer.prompt([
		{
			type: 'list',
			name: 'gps',
			message: 'Select a file to import',
			choices: gps,
			pageSize: 25
		}
	])
	.then(answers => {
		try{
			let gpsImport = JSON.parse(fs.readFileSync(`./Import/GPS/${answers.gps}`));

			var economyKey = Object.keys(SiiNunit.economy)[0];
			RemoveGPSData();

			for (let i = 0; i < gpsImport.behind.length; i++) {
				const point = gpsImport.behind[i];
				let nameless = GenerateNameless();
				AddWaypointStorage(nameless, {
					nav_node_position: new SiiParser.Set(point['nav_node_position'].x, point['nav_node_position'].y, point['nav_node_position'].z),
					direction: new SiiParser.Token(point['direction']['token'])
				})
				SiiNunit.economy[economyKey]['stored_gps_behind_waypoints'].push(new SiiParser.Token(nameless));
				SiiNunit.__order.push(['gps_waypoint_storage', nameless]);
			}

			for (let i = 0; i < gpsImport.ahead.length; i++) {
				const point = gpsImport.ahead[i];
				let nameless = GenerateNameless();
				AddWaypointStorage(nameless, {
					nav_node_position: new SiiParser.Set(point['nav_node_position'].x, point['nav_node_position'].y, point['nav_node_position'].z),
					direction: new SiiParser.Token(point['direction']['token'])
				})
				SiiNunit.economy[economyKey]['stored_gps_ahead_waypoints'].push(new SiiParser.Token(nameless));
				SiiNunit.__order.push(['gps_waypoint_storage', nameless]);
			}

			var registryNameless = Object.keys(SiiNunit.registry)[0];
			SiiNunit.registry[registryNameless].data[0] = BigInt(5);

			var serialized = SiiParser.Sii.Serialize(SiiNunit);
			fs.writeFileSync(status.savePath, serialized);
			console.log('Done!');
			WaitAndDie();
		}catch(e)
		{
			console.log('Error loading the gps file');
			WaitAndDie();
		}
	});
}

function AddWaypointStorage(nameless, waypoint)
{
	SiiNunit['gps_waypoint_storage'][nameless] = waypoint;
}

function RemoveGPSData()
{
	var economyKey = Object.keys(SiiNunit.economy)[0];

	for (let i = SiiNunit.__order.length - 1; i > 0; i--) {
		if(SiiNunit.__order[i][0] == 'gps_waypoint_storage')
		{
			SiiNunit.__order.splice(i, 1);
		}
	}

	SiiNunit['gps_waypoint_storage'] = {};
	SiiNunit.economy[economyKey]['stored_gps_behind_waypoints'] = [];
	SiiNunit.economy[economyKey]['stored_gps_ahead_waypoints'] = [];
}

function RequestRawList(dialog, list, callback)
{
	inquirer.prompt([
		{
			type: 'rawlist',
			name: 'value',
			message: dialog,
			choices: list,
			pageSize: 25
		}
	])
	.then(answers => {
		callback(answers.value);
	});
}

function WaitAndDie()
{
	setTimeout(() =>{}, 1000)
}

GetProfiles();

