const fs = require('fs');
const path = require('path')
const inquirer = require('inquirer');
const platformFolders = require('platform-folders');
const { exec } = require('child_process');
const SiiParser = require('./SiiParser/Sii.js');

var SiiNunit;
var status = {
	profile: '',
	save: '',
	savePath: ''
}

var cargos = JSON.parse(fs.readFileSync('./Data/Cargo.json').toString());
var cityCompany = JSON.parse(fs.readFileSync('./Data/CityCompany.json').toString());
var trailerVariants = JSON.parse(fs.readFileSync('./Data/TrailerVariants.json').toString());

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
			pageSize: 30
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
			pageSize: 30
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
			exec(`SII_Decrypt2.exe "${savePath}"`, (error, stdout, stderr) => {
				if (error) {
					console.error(`SII_Decrypt2.exe missing`);
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

	inquirer.prompt([
		{
			type: 'list',
			name: 'action',
			message: 'What do you want to do?',
			choices: [
				'Change assigned trailer',
				'Generate cargo',
				'Import cargo'
			],
			pageSize: 30
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
			default:
				console.log('Unknown action')
		}
	});	
}

function ChangeAssignedTrailerRoutine()
{
	var player = Object.keys(SiiNunit.player)[0];
	var currentTrailer = SiiNunit.player[player]['assigned_trailer'];
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
			pageSize: 30
		}
	])
	.then(answers => {
		SiiNunit.player[player]['assigned_trailer'] = new SiiParser.Token(answers.trailer);
		var serialized = SiiParser.Sii.Serialize(SiiNunit);
		fs.writeFileSync(status.savePath, serialized);
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
							GenerateCargo(cargoDetails);
						})
					})
				})
			})
		})
	})
	// Select city and list companies
	// Select first job related to that company anc modify job_offer_data
}

function GenerateCargo(details)
{
	var offerToken = SiiNunit.company[`company.volatile.${details.origin_company}.${details.origin_city}`].job_offer[0].toString();
	SiiNunit.job_offer_data[offerToken].target = `${details.target_company}.${details.target_city}`;
	SiiNunit.job_offer_data[offerToken].cargo = new SiiParser.Token(`cargo.${details.cargo}`);
	SiiNunit.job_offer_data[offerToken].trailer_definition = new SiiParser.Token(details.trailer);
	SiiNunit.job_offer_data[offerToken].trailer_variant = new SiiParser.Token(trailerVariants[details.trailer][0]);
	var serialized = SiiParser.Sii.Serialize(SiiNunit);
	fs.writeFileSync(status.savePath, serialized);
	fs.writeFileSync(`./Export/Cargo/${details.origin_city}_${details.origin_company}-${details.target_city}_${details.target_company}-${details.cargo}.json`, JSON.stringify(details));
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
		return;
	}
	inquirer.prompt([
		{
			type: 'list',
			name: 'cargos',
			message: 'Select a file to import',
			choices: cargos,
			pageSize: 30
		}
	])
	.then(answers => {
		try{
			let details = JSON.parse(fs.readFileSync(`./Import/Cargo/${answers.cargos}`));
			var offerToken = SiiNunit.company[`company.volatile.${details.origin_company}.${details.origin_city}`].job_offer[0].toString();
			SiiNunit.job_offer_data[offerToken].target = `${details.target_company}.${details.target_city}`;
			SiiNunit.job_offer_data[offerToken].cargo = new SiiParser.Token(`cargo.${details.cargo}`);
			SiiNunit.job_offer_data[offerToken].trailer_definition = new SiiParser.Token(details.trailer);
			SiiNunit.job_offer_data[offerToken].trailer_variant = new SiiParser.Token(trailerVariants[details.trailer][0]);
			var serialized = SiiParser.Sii.Serialize(SiiNunit);
			fs.writeFileSync(status.savePath, serialized);
		}catch(e)
		{
			console.log('Error loading the cargo')
		}
	});
}

function RequestRawList(dialog, list, callback)
{
	inquirer.prompt([
		{
			type: 'rawlist',
			name: 'value',
			message: dialog,
			choices: list,
			pageSize: 30
		}
	])
	.then(answers => {
		callback(answers.value);
	});
}

GetProfiles();

