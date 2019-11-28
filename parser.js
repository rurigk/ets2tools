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
		LoadSave(savePath)
	});
}

function LoadSave(savePath)
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

				SiiNunit = SiiParser.Sii.Parse(siiString);

				inquirer.prompt([
					{
						type: 'list',
						name: 'action',
						message: 'What do you want to do?',
						choices: [
							'Change assigned trailer'
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
						default:
							console.log('Unknown action')
					}
				});	
			});
		}
		else
		{
			SiiNunit = SiiParser.Sii.Parse(siiString);

			inquirer.prompt([
				{
					type: 'list',
					name: 'action',
					message: 'What do you want to do?',
					choices: [
						'Change assigned trailer'
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
					default:
						console.log('Unknown action')
				}
			});	
		}
	}catch(e)
	{
		console.log('Error loading the save');
	}
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
		fs.writeFileSync(status.savePath+'.json', JSON.stringify(SiiNunit));
	});	
}

GetProfiles();

