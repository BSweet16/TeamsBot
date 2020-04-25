// Includes
const Discord = require('discord.js');
const {prefix, token} = require('./config.json');
const client = new Discord.Client();
const fs = require('fs')
const defaultPoints = 500;

// Data locations
const teamsFile = './data/teams.txt';
const teamsRostersFile = './data/team-rosters.txt';
const teamsPointsFile = './data/team-points.txt';
const teamsInvitesFile = './data/team-invites.txt';
const teamsMatchesFile = './data/team-matches.txt';

// Read file data
var teamsListData; 		// Teams file data
var teamsRosterData; 	// Rosters file data
var teamsPointsData; 	// Points file data 
var teamsInvitesData;	// Invites file data
var teamsMatchesData; 	// Match results awaiting pending

var teamNamesList = [];		// A list of all the names of teams

/*	Incoming features
	- Bigger teams beating smaller teams not worth as many points for win.
	
	Extra Incoming features
	- Create roles of a team
	- Allow users to join a team by @ing a user  in the team (just detect the user's team)
	- Battle history
	- Cooldown between users making new teams. (Creating channels is intense).
		- DM the leader that there are channels made just for them.
	- Send notifications to team channels.
	- Remove teams.txt
	- Allow spaces in team names (lots of work)	- Clickable join button on invite
	- Add RankedBot to teams for 10 man

	Technical
	* Create team channels with a single channel object containing children channels to make team channel creating smoother
	- Look into switching current searching code blocks to get()
	- Set a timeout on messages from the bot to clear the chat spam. (Like Ranked Bot)
	- Move functions to another file

	Lessons
	- Functions that update a file (already has content) should use writeFileSync rather than writeFile to avoid
	the file being erased.
*/

/** Show all commands
    {} shows a command parameter is optional
    === Commands List === 
	teams											Help menu
	teams create [team name]    					Create a new team
	teams invite [user]								Add a user to the user's current team
	teams revoke [user]								Revoke an invite to your current team for user.
	teams leave										Leave your current team
	teams join 										Join a team. (requires invite)
	teams points									Display the user's teams' points
	teams points {team name}						Check the points of a specific team
	teams top										Check the top teams with their points
	teams roster {team name}						List the players on a given roster
	teams play teamName [user's team]-[other team]	Send a message for confirmation to the other team.
	teams confirm teamName							Confirm that a game with the listed score occured.
	teams deny teamName								Deny that a game with the listed score occured.
	teams pending [games]
*/
function showCommands (givenMessage){
	var helpMenu = {
		"content": "**Help Menu**",
		"embed": {
			"description": "__List of commands with descriptions__ \nIt is not required to type [] or {}. In [content], [] are not required but content is required when typing the command.\nThe same applies for these brackets, however {content} is optional to include in the command.",
			"color": 160860,
			"fields": [
				{
					"name": "Teams",
					"value": "View the help menu",
					"inline": false
				},
				{
					"name": "Teams create [team name]",
					"value": "Create a new team. The Team name must be one word with no spaces.",
					"inline": false
				},
				{
					"name": "Teams invite @[user]",
					"value": "Invite a user to your team.",
					"inline": false
				},
				{
					"name": "Teams revoke @[user]",
					"value": "Revoke an invite to your current team for user.",
					"inline": false
				},
				{
					"name": "Teams join [team name]",
					"value": "Join a team that has invited you.",
					"inline": false
				},
				{
					"name": "Teams leave",
					"value": "Leave your team.",
					"inline": false
				},
				{
					"name": "Teams points {team name}",
					"value": "View the points of your team. \nYou may also add a {team name} to check the points of another team.",
					"inline": false
				},
				{
					"name": "Teams top {number}",
					"value": "View the top 5 teams.\nYou may also enter how many top teams to view an amount different than 5.",
					"inline": false
				},
				{
					"name": "Teams roster {team name}",
					"value": "View the roster of your current team. \nYou  may also enter a team name to check the roster of another team.",
					"inline": false
				},
				{
					"name": "Teams play {team name} {score}",
					"value": "Submit a victory against a team to claim points.\nNote: Enter the score in the format [Your Team Score]-[Other Team Score] without the []s.",
					"inline": false
				},
				{
					"name": "Teams confirm {team name}",
					"value": "Confirm that a game with the listed score occurred.",
					"inline": false
				},
				{
					"name": "Teams deny {team name}",
					"value": "Deny that a game with the listed score occurred.",
					"inline": false
				}
			]
		}
	};

	givenMessage.channel.send(helpMenu);
}
/** Initializes the global variables from the save files at the start of the program.
 */
function readData(){
	// Read Team Names
	fs.readFile(teamsFile , 'utf8', function(err, data) {
		if (err) throw err;
		teamsListData = data;
	});
	if (teamsListData){
		teamNamesList = teamsListData.split('\n');
	}

	// Read Team rosters
	fs.readFile(teamsRostersFile , 'utf8', function(err, data) {
		if (err) throw err;
		teamsRosterData = data;
	});

	// Read Team points
	fs.readFile(teamsPointsFile , 'utf8', function(err, data) {
		if (err) throw err;
		teamsPointsData = data;
	});

	// Read Team invites
	fs.readFile(teamsInvitesFile , 'utf8', function(err, data) {
		if (err) throw err;
		teamsInvitesData = data;
	});

	// Read matches awaiting score pending
	fs.readFile(teamsMatchesFile , 'utf8', function(err, data) {
		if (err) throw err;
		teamsMatchesData = data;
	});
}
/** Get the username from a given Discord usertag.
 * @param usertag - The unsimplified usertag from the DiscordAPI. (Format Username#XXXX, where XXXX are numbers)
 */
function getUsernameFromTag(usertag){
	var shortenedUsername = "";
	for (var i = 0; i < usertag.length; i++){
		if (usertag[i] != '#'){
			shortenedUsername += usertag[i];
		}
		else{
			return shortenedUsername;
		}
	}
	return shortenedUsername;
}
/** Searches through the available rosters in order to find the roster of a specific team
 * @param teamName - The name of the team roster to find.
 */
function listroster(teamName){
	var foundRoster = [];
	var rosterFileList = teamsRosterData.split('\n');

	// Search through team roster data to find team name
	for (var teamPos = 0; teamPos < rosterFileList.length; teamPos++){
		if (rosterFileList[teamPos][0] != '-'){ // Search per team
			if (rosterFileList[teamPos].toUpperCase() == teamName.toUpperCase()){ // Team is found
				var playerPos = teamPos + 1;
				foundRoster += rosterFileList[teamPos]; // Add the team name to the return array
				while ((playerPos < rosterFileList.length) && (rosterFileList[playerPos].startsWith('-'))){ // Evaluate each player in the team
					var userToReturn = getUsernameFromTag(rosterFileList[playerPos].slice(1, rosterFileList[playerPos].length));
					foundRoster += ('\n' + userToReturn);
					playerPos++;
				}
				return foundRoster;
			}
		}
	}
	return foundRoster;
}
/** Searches through the available rosters in order to find the name of the team a user belongs to.
 * @param usertag - The usertag of the team member
 */
function findUserTeam(usertag){
	var rosterFileList = teamsRosterData.split('\n');

	// Search through team roster data to find user tag
	var teamPos = 0;
	var playerPos = 1; 
	while(playerPos < rosterFileList.length){
		while ((playerPos < rosterFileList.length) && (rosterFileList[playerPos].startsWith('-'))){ // Evaluate each player in the team
			if (rosterFileList[playerPos] == ('-' + usertag)){ // User is found
				return rosterFileList[teamPos];
			}
			playerPos++;
		}
		playerPos++;
		teamPos = playerPos-1;
	}

	return "";
}
/** Modifies the team information. This removes the entire team from the selected file.
 * @param fileToUpdate - The file in the data folder that needs to be changed with the given information
 * @param globalData - the local storage of the current data, to reduce workload.
 * @param searchValue - The name of the team to modify
 * @returns - The modified version of the global variable. (Since JS is a pass by reference language)
 */
function deleteTeamInfo(fileToUpdate, globalData, searchValue){
	var fileDataArray = globalData.split('\n');

	// Create local list with desired missing values
	for (let index = 0; index < fileDataArray.length; index++) {
		var dataFound = fileDataArray[index] == searchValue;
		var atLastItem = index == fileDataArray.length-1;
		if (dataFound && atLastItem){ // Deleting last item found
			fileDataArray.pop();
		}
		else if (dataFound){ // Normal delete value
			fileDataArray.splice(index, 1);
			while((fileDataArray.length > index) && (fileDataArray[index].startsWith('-'))){ // Remove any following elements on that removed object
				fileDataArray.splice(index, 1);
			}
		}
	}
	// Remove Spaces in array
	fileDataArray = cleanArray(fileDataArray);
	// Assign new list of team names to globalData
	globalData = "";
	for (var i = 0; i < fileDataArray.length; i++){ 
		if (i != 0){
			globalData += '\n';
		}
		globalData += fileDataArray[i];
	}
	// Write new team name data to file with team names
	fs.writeFileSync(fileToUpdate, globalData, (err) => { 
		if (err) throw err; 
	})

	// Return the value of the modified global data
	return globalData;
}
/** This function @returns an array with the team name as the first element and player names following.
 * Will return with empty array if the roster is not found.
 * @param usertag - The usertag of the player that should be on a roster
 */ 
function findUserRoster(usertag){
	var foundRoster = [];
	var rosterFileList = teamsRosterData.split('\n');

	// Search through team roster data to find user tag
	var teamPos = 0;
	var playerPos = 1; 
	while(playerPos < rosterFileList.length){
		while ((playerPos < rosterFileList.length) && (rosterFileList[playerPos].startsWith('-'))){ // Evaluate each player in the team
			if (rosterFileList[playerPos] == ('-' + usertag)){ // User is found
				foundRoster.push(rosterFileList[teamPos]);
				playerPos = teamPos + 1; // Start from the beginning of the roster
				while((rosterFileList[playerPos]) && (playerPos < rosterFileList.length) && (rosterFileList[playerPos].startsWith('-'))){ // Build a list of all the players on the found team
					var userToReturn = getUsernameFromTag(rosterFileList[playerPos].slice(1, rosterFileList[playerPos].length));
					foundRoster.push(userToReturn);
					playerPos++;
				}
				return foundRoster;
			}
			playerPos++;
		}
		playerPos++;
		teamPos = playerPos-1;
	}

	return foundRoster;
}
/** Return the number of points for a given team.
 * @param teamName - The name of the team to get the points of.
 */
function getPoints(teamName){
	var localTeamsPointsArray = teamsPointsData.split('\n');
	for (let index = 0; index < localTeamsPointsArray.length; index++) {
		if (localTeamsPointsArray[index].toUpperCase() == teamName.toUpperCase()){
			var teamPoints = localTeamsPointsArray[index+1].slice(1);
			return teamPoints;
		}
	}
	return -1;
}
/** Set the number of points a team should have.
 */
function setPoints(teamName, points){
	// Replace team's points with the new value
	var localTeamsPointsArray = teamsPointsData.split('\n');
	for (let index = 0; index < localTeamsPointsArray.length; index++) {
		if (localTeamsPointsArray[index].toUpperCase() == teamName.toUpperCase()){
			localTeamsPointsArray[index+1] = ('-' + String(points));
		}
	}

	// Write new array back to points file
	teamsPointsData = localTeamsPointsArray.join('\n');
	fs.writeFileSync(teamsPointsFile, teamsPointsData, (err) => { 
		if (err) throw err; 
	})
}
/** Calculates the number of points to add abd subtract from each team's point total.
 * @param winningTeamPoints - The number of points the winning team has before the exchange.
 * @param loosingTeamPoints - The number of points the loosing team has before the exchange.
 */
function exchangePoints(winningTeamPoints, loosingTeamPoints){
	// if (winningTeamPoints > loosingTeamPoints){ // The team that was intended to win, won

	// }
	// else if (winningTeamPoints < loosingTeamPoints){ // The underdog won

	// }
	// else{ // They must be the same
		return (winningTeamPoints + loosingTeamPoints)/4;
	// }
}
/** Temporary solution to the bug causing random space to be at the beginning of the file and between teams
 */
function cleanArray(arrayToClean){
	for (let index = 0; index < arrayToClean.length; index++) {
		if (arrayToClean[index] == ""){
			arrayToClean.splice(index, 1);
		}
	}
	return arrayToClean;
}
/** Create an invite message to send to a player.
 * @param createdBy - The user sending the invite
 * @param teamName - The name of the team the user is being invited to
 * @param createdByThumbnail - The Discord picture of the user making the invite
 * @param timeStamp - The time the invite is created.
 */
function createInviteMessage(createdBy, teamName, createdByThumbnail, timeStamp){
	var invite = {
		"embed": {
		  "title": createdBy + " has invited you to **" + teamName + "**!",
		  "description": `Type the following command in a server channel to join. 
		  					\n[Teams join ${teamName}](https://discordapp.com)`,
		  "color": 160860,
		  "timestamp": timeStamp,
		  "thumbnail": {
			"url": createdByThumbnail
		  }
		}
	  }
	  return invite;
}
/** Validate a user has an active invite to a team.
 * @param userToJoin - The tag of the user who should be joining the team
 * @param teamToJoin - The team the userToJoin should be joining.
 * @returns - The index in the split array of invite data where the team is.
 */
function userHasInviteToTeam(userToJoinTag, teamToJoin){
	var localInviteArray = teamsInvitesData.split('\n');
	var teamIndex = 0;
	while (teamIndex < localInviteArray.length){
		if (!localInviteArray[teamIndex].startsWith('-')){ // This is a team
			var playerIndex = teamIndex+1;
			while(playerIndex < localInviteArray.length && localInviteArray[playerIndex].startsWith('-')){ // Scan the data for players
				var playerFound = (localInviteArray[playerIndex] == ('-' + userToJoinTag));
				var teamInvitedThem = (localInviteArray[teamIndex].toUpperCase() == teamToJoin.toUpperCase());
				if (playerFound && teamInvitedThem){ // Player has active invite from team to join
					return teamIndex;
				}
				playerIndex++;
			}
			teamIndex = playerIndex;
		}
	}
	return -1;
}
/** Handles deleting invites
 * @param userTagToRemove - The user tag who should have the invitation being removed.
 * @param teamToRemoveIndex - The index in the split array where the team name is located. This will be the beginning of the search for the player.
 */
function removeInvite(userTagToRemove, teamToRemoveIndex){ 
	var localTeamInviteList = teamsInvitesData.split('\n');
	var singleUserDeleted = false;
	for (var index = teamToRemoveIndex+1; index < localTeamInviteList.length; index++){
		if (localTeamInviteList[index].startsWith('-')){ 
			if (localTeamInviteList[index] == ('-' + userTagToRemove)){ // Found user
				var nextLineIsMember = localTeamInviteList[index+1] ? (localTeamInviteList[index+1].startsWith('-') ? true : false) : false; 
				if (index == teamToRemoveIndex+1 && !nextLineIsMember){ // User was the only invite the team had out
					teamsInvitesData = deleteTeamInfo(teamsInvitesFile, teamsInvitesData, localTeamInviteList[teamToRemoveIndex]);
					return;
				}	
				else{ // There are other invites
					localTeamInviteList.splice(index, 1);
					singleUserDeleted = true;
					break;
				}
			}
		}
	}
	if (singleUserDeleted){
		// Combine array back into string and return it
		teamsInvitesData = "";
		localTeamInviteList.forEach((localTeamInvite, index) => {
			if (index != 0){
				teamsInvitesData += '\n';
			}
			teamsInvitesData += localTeamInvite;
		});

	}
	else{
		console.log("Failed to find user in removeInvite()");
	}

}
/** Check if a team has any invites pending.
 * @param teamName - The name of the team to check if they have any invites currently pending.
 */
function teamHasActiveInvites(teamName){
	var localInviteArray = teamsInvitesData.split('\n');
	var teamIndex = 0;
	while (teamIndex < localInviteArray.length){
		if (!localInviteArray[teamIndex].startsWith('-')){ // This is a team
			if (localInviteArray[teamIndex] == teamName){
				return teamIndex;
			}
		}
		teamIndex++;
	}
	return -1;
}
/** Add a specific user to a teams roster
 * @param userToAddTag - The user to add to the roster.
 * @param teamName - The roster to add the user to.
 * @returns - An new roster data array
 */
function addToRoster(userToAddTag, teamName){
	var rosterFileArray = teamsRosterData.split('\n');

	// Search through team roster data to find team name
	for (var teamPos = 0; teamPos < rosterFileArray.length; teamPos++){
		if (rosterFileArray[teamPos][0] != '-'){ // Search per team
			if (rosterFileArray[teamPos].toUpperCase() == teamName.toUpperCase()){ // Team is found
				var playerPos = teamPos + 1;
				while ((playerPos < rosterFileArray.length) && (rosterFileArray[playerPos].startsWith('-'))){ // Evaluate each player in the team
					playerPos++;
				}
				rosterFileArray.splice(playerPos, 0, ('-' + userToAddTag)); // Add the user at the index
			}
		}
	}

	// Write the new roster data array to the roster file
	teamsRosterData = "";
	for (var index = 0; index < rosterFileArray.length; index++){
		if (index != 0){
			teamsRosterData += '\n';
		}
		teamsRosterData += rosterFileArray[index];
	}
}
/** This function creates a channel as a sub-channel of the team category.
 * @param serverObject - The object of the message.guild
 * @param givenMessage - The object of the message that created the team.
 * @param parentChannel - The team channel object in the server 
 * @param channelName - A string that the chanel should be called.
 * @param channelType - A string that dictates the channel type.
 */
function createSubChannel(serverObject, givenMessage, parentChannel, channelName, channelType){
	// Create Announcements text channel
	var newChannelOptions = {
		type: channelType,
		permissionOverwrites: [
			{	id: serverObject.id,
				deny: ['VIEW_CHANNEL'],
			},
			{	id: givenMessage.author.id,
				allow: ['VIEW_CHANNEL'],
			},
		]
	};
	serverObject.channels.create(channelName, newChannelOptions).then(channel => {
		let category = serverObject.channels.cache.find(c => c == parentChannel);

		if (category){
			channel.setParent(category.id);
		}
		else{throw new Error("Category channel does not exist")}
	}).catch(console.error);
}
/** Creates a category with the default channels for a team.
 * @param givenMessage - The message object that the user sent to create the team. Used to tell where to create the channels.
 * @param teamName - Creates category named the team
 */
function createTeamCategory(givenMessage, teamName){
	var server = givenMessage.guild;
	var newChannelOptions = {
		type: "Category",
		permissionOverwrites: [
			{	id: server.id,
				deny: ['VIEW_CHANNEL'],
			},
			{	id: givenMessage.author.id,
				allow: ['VIEW_CHANNEL'],
			},
		]
	};
	server.channels.create(teamName, newChannelOptions).then(masterCategory => {// Create team channels in the category
		// Create Announcements text channel
		createSubChannel(server, givenMessage, masterCategory, "Announcements", "Text");
		createSubChannel(server, givenMessage, masterCategory, "Strats", "Text");
		createSubChannel(server, givenMessage, masterCategory, "General", "Text");
		createSubChannel(server, givenMessage, masterCategory, "General", "Voice");
		createSubChannel(server, givenMessage, masterCategory, "General 2", "Voice");
		createSubChannel(server, givenMessage, masterCategory, "Competitive", "Voice");
	}).catch(console.error);
}
/** Adds a new member to a team channel permissions.
 * @param givenMessageObject - The message object that was sent to activate the command.
 * @param teamName - The name of the team category title.
 * @param userToRemove - User object to remove.
 */
function addMemberToTeamChannels(givenMessageObject, teamName, userToAdd){
	var serverChannels = givenMessageObject.guild.channels.cache;
	var teamCategoryChannel;
	serverChannels.forEach(currChannel => { // Find team category channel
		if (currChannel.type == "category" && currChannel.name.toUpperCase() == teamName.toUpperCase()){
			teamCategoryChannel = currChannel;
		}
	})
	if (teamCategoryChannel){ // Add user to category channel. Assume children are synced.
		teamCategoryChannel.updateOverwrite(userToAdd, { VIEW_CHANNEL: true });
	}
	else{console.log("addMemberToTeamChannels: Unable to find teamCategoryChannel.");}
}
/** Remove a member from a team channel permissions.
 * @param givenMessageObject - The message object that was sent to activate the command.
 * @param teamName - The name of the team category title.
 * @param userToRemove - User object to remove.
 */
function removeMemberFromTeamChannels(givenMessageObject, teamName, userToRemove){
	var serverChannels = givenMessageObject.guild.channels.cache;
	var teamCategoryChannel;
	serverChannels.forEach(currChannel => { // Find team category channel
		if (currChannel.type == "category" && currChannel.name.toUpperCase() == teamName.toUpperCase()){
			teamCategoryChannel = currChannel;
		}
	})
	if (teamCategoryChannel){ // Remove user from category channel. Assume children are synced
		teamCategoryChannel.permissionOverwrites.get(userToRemove).delete();
	}
	else{console.log("removeMemberFromTeamChannels: Unable to find teamCategoryChannel.");}
}
/** Remove all team channels from the server. Used during a team deletion.
 * @param givenMessageObject - The message object that was sent to activate the command.
 * @param teamName - The name of the team being deleted. Used for the channel category title.
 */
function deleteTeamChannels(givenMessageObject, teamName){
	var serverChannels = givenMessageObject.guild.channels.cache;
	var teamCategoryChannel;
	serverChannels.forEach(currChannel => { // Find team category channel
		if (currChannel.type == "category" && currChannel.name == teamName){
			teamCategoryChannel = currChannel;
		}
	})
	if (teamCategoryChannel){ // Delete the category and children channels
		teamCategoryChannel.children.forEach(childChannel => {
			childChannel.delete();
		})
		teamCategoryChannel.delete();
	}
	else{console.log("deleteTeamChannels: Unable to find teamCategoryChannel. \nReminder: Delete team category and channels.");}
}
/** Exchange points between two teams during a fight. 
 */
function fight(winningTeamName, loosingTeamName, messageObject){
	var winningTeamPoints = parseInt(getPoints(winningTeamName));
	var loosingTeamPoints = parseInt(getPoints(loosingTeamName));
	var battleDifference = exchangePoints(winningTeamPoints, loosingTeamPoints);

	// Exchange points between players
	winningTeamPoints = winningTeamPoints + battleDifference;
	loosingTeamPoints = loosingTeamPoints - battleDifference;

	// Write new points for teams to file
	setPoints(winningTeamName, String(winningTeamPoints));
	setPoints(loosingTeamName, String(loosingTeamPoints));

	// Send success message 
	messageObject.channel.send("**" + winningTeamName + "** defeated **" + loosingTeamName + "** for " + battleDifference + " points!");

}
/** Find the index of the teamToFind in the list of points
 * @param teamToFind - The UPPERCASE name of the team to find in the points data.
 */
function teamExistsForFight(teamToFind){
	var localTeamArray = teamsPointsData.split('\n');
	var foundTeam = "";
	localTeamArray.forEach(currTeamName => {
		if (teamToFind.toUpperCase() == currTeamName.toUpperCase()){
			foundTeam = currTeamName;
		}
	});
	return foundTeam;
}
/** Add an event of a game between two teams
 * @param otherTeamName - The name of the team that is being notified of the game. (They did not file this game)
 * @param teamName - The name of the team that filed the game.
 * @returns - An new roster data array
 */
function findExistingMatch(teamName){
	var teamsMatchesArray = teamsMatchesData.split('\n');

	// Search through team match data to find team name
	for (var teamPos = 0; teamPos < teamsMatchesArray.length; teamPos++){
		if (teamsMatchesArray[teamPos][0] != '-'){ // Search per team
			if (teamsMatchesArray[teamPos].toUpperCase() == teamName.toUpperCase()){ // Team is found
				return teamsMatchesArray[teamPos+1]; // Return the found match
			}
		}
	}
	return "";
}
/** Searches through the available rosters in order to find the captain of a specific team
 * @param teamName - The name of the team roster to find.
 */
function getCaptain(teamName){
	var rosterFileList = teamsRosterData.split('\n');

	// Search through team roster data to find the captain
	for (var teamPos = 0; teamPos < rosterFileList.length; teamPos++){
		if (rosterFileList[teamPos][0] != '-'){ // Search per team
			if (rosterFileList[teamPos].toUpperCase() == teamName.toUpperCase()){ // Team is found
				var playerPos = teamPos + 1;
				return rosterFileList[playerPos].slice(1, rosterFileList[playerPos].length);
			}
		}
	}
	return "";
}

client.login(token);
client.once('ready', () =>{
	readData();
})

client.on('message', message =>{ 
	var messageContentUpper = message.content.toUpperCase(); 	// Used to provide non-case sensitive commands
	var messageArrayUpper = messageContentUpper.split(" "); 	// Used to access command information (non-case sensitive)
	var messageArray = message.content.split(" "); 				// Used to access command information
	
	// List all commands
	if(messageContentUpper == `${prefix}` || messageContentUpper == `${prefix}`[0]){ 
		showCommands(message);
		message.delete(); // Clean chat history
	}

	// Detect messages coming from DMs
	else if ( message.guild === null &&  
			!(messageArrayUpper.length > 3 && messageArrayUpper[0] > "TEAMS" && messageArrayUpper[1] > "LEAVE")){ 
		// Do nothing for DMs
	}

	else if(messageArrayUpper[0] == `${prefix}` || messageArrayUpper[0] == `${prefix}`[0]){
		// Create a team
		if (messageArrayUpper[1] == "CREATE"){ 
			if (messageArray.length != 3){
				message.channel.send("*teams create [NEW TEAM]*\t\t - \t\tCreate a new team");
			}
			else{
				var userTeamName = findUserTeam(message.author.tag);
				if (!userTeamName){ // Verify the user is not already in a team
					// Verify team name is available
					var teamAvailable = true;
					var newTeamName = messageArray[2];
					for (var i = 0; i < teamNamesList.length; i++){
						if (teamNamesList[i].toUpperCase() == newTeamName.toUpperCase()){ // Do not allow duplicates regardless of case-sensitive
							teamAvailable = false;
						}
					}

					if(teamAvailable){
						// Create new channels for the team
						createTeamCategory(message, newTeamName);

						// Create new team
						if (teamsListData){
							teamsListData += ('\n' + newTeamName);
						}
						else{
							teamsListData = newTeamName;
						}
						fs.writeFile(teamsFile, teamsListData, (err) => { 
							if (err) throw err; 
						})
						
						// Create new team points
						var newTeampoints = (newTeamName + '\n-' + String(defaultPoints));
						if (teamsPointsData){
							teamsPointsData += ('\n' + newTeampoints);
						}
						else{
							teamsPointsData = newTeampoints;
						}
						fs.writeFile(teamsPointsFile, teamsPointsData, (err) => { 
							if (err) throw err; 
						})

						// Create new team roster
						var newTeamRoster = (newTeamName + '\n-' + message.author.tag);
						if (teamsRosterData){
							teamsRosterData += ('\n' + newTeamRoster);
						}
						else{
							teamsRosterData = newTeamRoster;
						}
						fs.writeFile(teamsRostersFile, teamsRosterData, (err) => { 
							if (err) throw err; 
						})
						
						// Update teams list and send success message
						teamNamesList = teamsListData.split('\n');
						message.channel.send(message.author.username + " created **" + newTeamName + "**!");
					}
					else{
						message.channel.send("Team **" + newTeamName + "** already exists.");
					}
				}
				else{
					message.channel.send(message.author.username + " is already a member of " + userTeamName + "!");
				}
			}
		}
		// Display the roster for a team
		else if (messageArrayUpper[1] == "ROSTER"){
			var foundRosterString = "";
			if (messageArray.length == 2 || messageArray.length == 3){ // Display the user's current team roster
				// Find the desired roster
				var foundRoster;
				if (messageArray.length == 2){ // Get the user's team roster
					foundRoster = findUserRoster(message.author.tag);
				}
				else if (messageArray.length == 3){ // Display a roster by searching
					foundRoster = listroster(messageArray[2]);
					if (foundRoster.length != 0){
						foundRoster = foundRoster.split('\n'); 
					}
					else{foundRoster = ""; message.channel.send("Unable to find " + messageArray[2]);}
				}
				
				// Display team roster
				if (foundRoster.length > 0){ 
					for (let index = 0; index < foundRoster.length; index++) {
						if (index > 1){
							foundRosterString += "\n";
						}
						if (index != 0){
							foundRosterString += (index + " - " + foundRoster[index]);
						}
					}
					var embeddedMessage = { // Make embedded message
						"embed": {
							"title": "**" + `${foundRoster[0]}` + " Roster**",
							"description": `${foundRosterString}`,
							"color": 160860
						}
					};
					message.channel.send(embeddedMessage);
				}
				else{ // Messages for users that searched for a team that doesnt exist
					if (messageArray.length == 2){message.channel.send(message.author.username + " is not currently in a team.");}
					else if (messageArray.length == 3){message.channel.send(messageArray[2] + " is not a current team.");}
					else {message.channel.send("ROSTER: Unable to find roster.");}
				}
			}
			else{message.channel.send("*teams roster [TEAM]*\t\t - \t\tView the roster of specified team.");}
			
		}
		// Allow a player to leave a team
		else if (messageArrayUpper[1] == "LEAVE"){
			if (messageArrayUpper.length == 2){
				var userTeamArray = findUserRoster(message.author.tag);
				
				if (userTeamArray.length > 0){ // User had a team, remove them from the team roster
					var teamName = userTeamArray[0];
					var teamDataIndex = -1;

					// Find the position of the roster in the localTeamRosterList
					var localTeamRostersList = teamsRosterData.split('\n');
					for (let index = 0; index < localTeamRostersList.length; index++) {
						if (localTeamRostersList[index] == teamName){
							teamDataIndex = index;
						}
					}

					// Remove the user from the roster
					if (userTeamArray.length == 2){ // If the user was the only member, also erase the team
						// Remove the team channels
						deleteTeamChannels(message, teamName);

						// Update team list info
						teamsListData =  deleteTeamInfo(teamsFile, teamsListData, teamName);
						teamNamesList = teamsListData.split('\n'); // Update global teamNamesList

						// Update Roster info
						teamsRosterData = deleteTeamInfo(teamsRostersFile, teamsRosterData, teamName);

						// Update Points info
						teamsPointsData = deleteTeamInfo(teamsPointsFile, teamsPointsData, teamName);

						// See if the team had any active invites, and remove them
						if (teamHasActiveInvites(teamName)){
							teamsInvitesData = deleteTeamInfo(teamsInvitesFile, teamsInvitesData, teamName);
						}

						
					}
					else{ // There were other members. Only remove this member
						var foundMember = false;
						for (let index = teamDataIndex + 1; index < localTeamRostersList.length; index++) { // Find the index of the specific user
							var elementMatchesUserTag = localTeamRostersList[index] == ('-' + message.author.tag);
							if (elementMatchesUserTag){
								localTeamRostersList.splice(index, 1);
								foundMember = true;
								if (localTeamRostersList.length == 0){ // If that was the last element of the list, dont repeat
									break;
								}
							}
						}

						if (!foundMember){ // Validate the user was found
							console.log("Failed to find " + message.author.tag + " when user was leaving roster with multiple members.")
						}
						else{
							// Combine the array back into teamRosterData
							teamsRosterData = "";
							for (var i = 0; i < localTeamRostersList.length; i++){
								if (i != 0){
									teamsRosterData += '\n';
								}
								teamsRosterData += (localTeamRostersList[i]);
							}
							
							// Remove user from the team channels
							removeMemberFromTeamChannels(message, teamName, message.author.id);

							// Write new roster data to file
							fs.writeFileSync(teamsRostersFile, teamsRosterData, (err) => { 
								if (err) throw err; 
							})
						}
					}
					message.channel.send(getUsernameFromTag(message.author.tag) + " has left " + teamName + " :frowning:.")
				}
				else{message.channel.send(getUsernameFromTag(message.author.tag) + " is not a member of a team :zipper_mouth:.");}
			}
			else{message.channel.send("*teams leave*\t\t - \t\tLeave your current team.");}
		}
		// Display the amount of points a team has
		else if (messageArrayUpper[1] == "POINTS"){
			if (messageArray.length == 2){
				var userTeam = findUserTeam(message.author.tag);
				if (userTeam){
					var teamPoints = getPoints(userTeam);
					message.channel.send("**" + userTeam + "** currently has **" + teamPoints + "** points.");
				}
				else{
					message.channel.send("You are not currently a member of a team. Please specify a team.");
				}
			}
			else if (messageArray.length == 3){
				var teamPoints = getPoints(messageArray[2]);
				message.channel.send("**" + messageArray[2] + "** currently has **" + teamPoints + "**.");
			}
			else{

			}
		}
		// Display the teams with the top X amount of points
		else if (messageArrayUpper[1] == "TOP"){
			// Create an empty array to contain the top X results
			var topResults = 5;
			var topTeams = [];
			var topTeamsPoints = [];
			if (messageArray.length == 3 && parseInt(messageArray[2]) > 0){
				topResults = parseInt(messageArray[2]);
			}
			for (let i = 0; i < topResults; i++){ // Initialize data with the number of results entered
				topTeams.push("");
				topTeamsPoints.push(-1);
			}

			// Find the top X teams
			var localTeamsPointsArray = teamsPointsData.split('\n');
			if (localTeamsPointsArray != ""){
				var currentTeamIndex = 0;
				while (currentTeamIndex < localTeamsPointsArray.length) {
					if (!localTeamsPointsArray[currentTeamIndex].startsWith('-')) {
						// Compare each team points to the top list
						var currTeamPoints = parseInt(localTeamsPointsArray[currentTeamIndex + 1].slice(1));
						var currTeam = localTeamsPointsArray[currentTeamIndex];
						if (currTeamPoints > parseInt(topTeamsPoints[topTeamsPoints.length - 1])) { // Current team is in the top list
							for (var index = 0; index < topTeamsPoints.length; index++) { // Find the correct position for it
								if (currTeamPoints > parseInt(topTeamsPoints[index])) {
									// Insert the team into the top of the list
									var oldPositionPoints = topTeamsPoints[index];
									var oldPositionTeam = topTeams[index];
									topTeamsPoints[index] = currTeamPoints;
									topTeams[index] = currTeam;

									// Move the rest of the top teams down
									var movedDownPoints;
									var movedDownTeam;
									var alternate = false;
									index++;
									while (index < topTeamsPoints.length) {
										if (alternate) {
											oldPositionPoints = topTeamsPoints[index];
											oldPositionTeam = topTeams[index];
											topTeamsPoints[index] = movedDownPoints;
											topTeams[index] = movedDownTeam;
											alternate = false;
										}
										else {
											movedDownPoints = topTeamsPoints[index];
											movedDownTeam = topTeamsPoints[index];
											topTeamsPoints[index] = oldPositionPoints;
											topTeams[index] = oldPositionTeam;
											alternate = true;
										}
										index++;
									}
								}
							}
						}

					}
					currentTeamIndex += 2;
				}

				// Display the current top teams
				var output = "";
				for (let index = 0; index < topTeams.length; index++) {
					if (topTeamsPoints[index] != -1) { // If the team is not a placeholder, display it
						if (index != 0) {
							output += '\n';
						}
						output += ("#" + (index + 1) + " - " + topTeams[index] + " - " + topTeamsPoints[index] + " points");
					}

				}
				var embeddedMessage = { // Make embedded message for UI "prettyness"
					"embed": {
						"title": "Top Caliber Teams",
						"description": "```" + `${output}` + "```",
						"color": 160860
					}
				};
				message.channel.send(embeddedMessage);
			}
			else{message.channel.send("There are no teams.")}
		}
		// Invite the following users to the sender's team
		else if (messageArrayUpper[1] == "INVITE"){
			if (messageArray.length > 2){
				var mentionedUsers = message.mentions.users;
				var userTeam = findUserTeam(message.author.tag);
				var localInviteArray = teamsInvitesData.split('\n');
				var successfullyInvitedUsers = [];
				if (userTeam.length > 0){
					// Invite all users after "teams invite [..] "
					mentionedUsers.forEach(user => {
						// Check if the user was mentioned more than once
						if (!successfullyInvitedUsers.includes(user.username)){
							if (userHasInviteToTeam(user.tag, userTeam) == -1) {// Check: User already has an invite from the team 
								if (findUserTeam(user.tag) == "") { // Check: User doesnt already have a team
									// Add the invite to the array
									var teamInviteIndex = teamHasActiveInvites(userTeam);
									if (teamInviteIndex >= 0) { // If the team has active invites
										localInviteArray.splice(teamInviteIndex + 1, 0, ('-' + user.tag)); // Insert the user after the team name
									}
									else { // Create a new section of invites for the team
										localInviteArray.push(userTeam);
										localInviteArray.push('-' + user.tag);
									}

									// Add to list of successfully invited users
									successfullyInvitedUsers.push(user.username);

									// Send a private message to them
									var inviteMessage = createInviteMessage(message.author.username, userTeam, message.author.avatarURL({format: 'png', size: 1024}), message.createdTimestamp);
									user.send(inviteMessage);
								}
								else { message.channel.send(user.username + " already has a team."); }
							}
							else { message.channel.send(user.username + " already has a pending invite."); }
						} else{ message.channel.send(user.username + " mentioned more than once, lets chill out."); }
					});

					// Send confirmation message to user and new data to file
					if (successfullyInvitedUsers.length > 0){
						var successMessage = "Invite sent to ";
						for (var index = 0; index < successfullyInvitedUsers.length; index++){
							if (index != 0){
								successMessage += ", ";
							}
							successMessage += "**" + successfullyInvitedUsers[index] + "**";
						}
						message.channel.send(successMessage);
						
						// Write local invite array to invite data
						teamsInvitesData = "";
						localInviteArray = cleanArray(localInviteArray);
						localInviteArray.forEach((newInviteLine, inviteCounter) => {
							if (inviteCounter != 0){
								teamsInvitesData += '\n';
							}
							teamsInvitesData += newInviteLine;
						});

						// Write new data to the file
						fs.writeFileSync(teamsInvitesFile, teamsInvitesData, (err) => { 
							if (err) throw err; 
						})
					}
					
				}
				else{
					message.channel.send("You must be a part of a team to invite someone.");
				}
			}
			else{
				message.channel.send("*teams invite @[username]*\t\t - \t\tInvite a user to your team.");
			}
			
			
		}
		// Join a team 
		else if (messageArrayUpper[1] == "JOIN"){
			var teamToJoin = messageArray[2];
			var userToJoinTag = message.author.tag;

			// Compare the user to the invite list
			var allowedToJoin = userHasInviteToTeam(message.author.tag, messageArray[2]);
			if (allowedToJoin > -1){
				// Remove the invite
				removeInvite(userToJoinTag, allowedToJoin); // Create a new invite array of
				
				// Add the user to the roster
				addToRoster(userToJoinTag, teamToJoin);
				
				// Give the user access to the team channel sections.
				addMemberToTeamChannels(message, teamToJoin, message.author);

				// Announce the user to the team
				if (teamToJoin && message.author.username){
					message.channel.send("**" + message.author.username + "** has  joined **" + teamToJoin + "**!"); // @TODO Send this message to the team chat when special channels are added
					message.author.send("Welcome to the team! \nYou now have access to the teams' channels in this server.");
				}
				else{
					message.channel.send("Sorry, something went wrong!");
				}

				// Write new data to the file
				fs.writeFileSync(teamsInvitesFile, teamsInvitesData, (err) => { 
					if (err) throw err; 
				})
				fs.writeFileSync(teamsRostersFile, teamsRosterData, (err) => { 
					if (err) throw err; 
				})
			}
			else{message.channel.send(message.author.username + " does not currently have an invite to " + teamToJoin);}
		}
		// Remove a user from the roster. (@The player in the command)
		else if (messageArrayUpper[1] == "KICK"){
			if (messageArray.length >= 3){
				var usersToRemove = message.mentions.users;
				var sucessfullyKickedMembersString = "";
				var teamDisbanded = false;
				usersToRemove.forEach(userToKick => { // Allow to kick multiple users at once
					if (userToKick.tag){ // Case: Unable to find user
						var userToKickTeam = findUserRoster(userToKick.tag);
						if (userToKickTeam.length > 0){ // Case: User was not in a team
							// Find the position of the roster in the localTeamRosterList
							var localTeamRostersList = teamsRosterData.split('\n');
							var teamDataIndex = -1;
							for (let index = 0; index < localTeamRostersList.length; index++) {
								if (localTeamRostersList[index] == userToKickTeam[0]){
									teamDataIndex = index;
								}
							}

							// Remove the user from the roster
							if (userToKickTeam.length == 2){ // If the user was the only member, also erase the team
								// Remove the team channels
								deleteTeamChannels(message, userToKickTeam[0]);

								// Update team list info
								teamsListData =  deleteTeamInfo(teamsFile, teamsListData, userToKickTeam[0]);
								teamNamesList = teamsListData.split('\n'); // Update global teamNamesList

								// Update Roster info
								teamsRosterData = deleteTeamInfo(teamsRostersFile, teamsRosterData, userToKickTeam[0]);

								/* Update Points info */
								teamsPointsData = deleteTeamInfo(teamsPointsFile, teamsPointsData, userToKickTeam[0]);

								// See if the team had any active invites, and remove them
								if (teamHasActiveInvites(userToKickTeam[0])){
									teamsInvitesData = deleteTeamInfo(teamsInvitesFile, teamsInvitesData, userToKickTeam[0]);
								}

								// Message the team was disbanded
								message.channel.send(message.author.username + " has disbanded the team by kicking all the players.");
								teamDisbanded = true;
								// @TODO - Should we DM all the players and tell them who disbanded the team?
							}
							else{ // There were other members. Only remove this member
								var foundMember = false;
								for (let index = teamDataIndex + 1; index < localTeamRostersList.length; index++) { // Find the index of the specific user
									var elementMatchesUserTag = localTeamRostersList[index] == ('-' + userToKick.tag);
									if (elementMatchesUserTag){
										localTeamRostersList.splice(index, 1);
										foundMember = true;
										if (localTeamRostersList.length == 0){ // If that was the last element of the list, dont repeat
											break;
										}
									}
								}

								if (foundMember){ // Validate the user was found
									// Remove user from the team channels
									removeMemberFromTeamChannels(message, userToKickTeam[0], userToKick);

									// Combine the array back into teamRosterData
									teamsRosterData = "";
									for (var i = 0; i < localTeamRostersList.length; i++){
										if (i != 0){
											teamsRosterData += '\n';
										}
										teamsRosterData += (localTeamRostersList[i]);
									}

									// Write new roster data to file
									fs.writeFileSync(teamsRostersFile, teamsRosterData, (err) => { 
										if (err) throw err; 
									})
								}
								else{console.log("Failed to find " + userToKick.username + " when kicking user from roster with multiple members.");}
							}
							// Create a string of the successfully kicked
							if (sucessfullyKickedMembersString != ""){
								if (usersToRemove[usersToRemove.length-1].username == userToKick.username){
									sucessfullyKickedMembersString += " and ";
								}
								else{
									sucessfullyKickedMembersString += ", ";
								}
							}
							sucessfullyKickedMembersString += userToKick.username;
						}
						else{message.channel.send("This user is not in a team.");}
					}else{message.channel.send("You must be part of a team to kick someone..");} // @TODO Change to "must be correct position in the team to remove someone" when roles added.}	
				});
				if (!teamDisbanded){
					message.channel.send(message.author.username + " has kicked " + sucessfullyKickedMembersString + " from the roster!");
				}

			}else{message.channel.send("*Teams kick @[username]*\t\t - \t\tKick a user from the team.");}
		}
		// Take back an invitation for a user to join a team.
		else if (messageArrayUpper[1] == "REVOKE"){
			if (messageArray.length > 2){
				var mentionedUsers = message.mentions.users;
				var teamWithInvite = findUserTeam(message.author.tag);
				var localInviteArray = teamsInvitesData.split('\n');
				var successfullyRevokedUsers = [];
				if (teamWithInvite.length > 0){ // Check: Current user has a team
					// Revoke for every [user]
					mentionedUsers.forEach(user => {
						if (!successfullyRevokedUsers.includes(user.username)){// Check: User was mentioned more than once
							var invitePosition = userHasInviteToTeam(user.tag, teamWithInvite);
							if (invitePosition > -1) {// Check: User has an invite from the team 
								// Remove the user from the teams list of invites
								removeInvite(user.tag, invitePosition); 

								// Add to list of successfully revoked users
								successfullyRevokedUsers.push(user.username);
							} else { message.channel.send(user.username + " does not have a pending invite."); }
						} else{ message.channel.send(user.username + " mentioned more than once, lets chill out."); }
					});

					// Send confirmation message to user and new data to file
					if (successfullyRevokedUsers.length > 0){
						var successMessage = "";
						if (successfullyRevokedUsers.length > 1){
							successMessage = "Revoked invites for: ";
						}
						else{
							successMessage = "Revoked invite for ";
						}
						
						for (var index = 0; index < successfullyRevokedUsers.length; index++){
							if (index != 0){
								successMessage += ", ";
							}
							successMessage += "**" + successfullyRevokedUsers[index] + "**";
						}

						message.channel.send(successMessage);
					}
				} else{ message.channel.send(message.author.username + " is not in a team."); }
			} else{message.channel.send("*Teams revoke @[username]*\t\t - \t\tTake back a user's invite to the team.");}
		}
		// A team can declare that they beat another team.
		else if (messageArrayUpper[1] == "PLAY" || messageArrayUpper[1] == "BATTLE"){
			if (messageArray.length == 4){
				var userTeam = findUserTeam(message.author.tag);
				if (userTeam.length > 0){ // Case: User is in a team.
					var otherTeam = teamExistsForFight(messageArray[2]);
					if (otherTeam.length > 0){ // Case: Other team exists.
						var existingMatch = findExistingMatch(otherTeam);
						if (!(existingMatch.length > 0)){ // Case: The team does not currently already have a match pending.
							if (messageArray[3] && messageArray[3].includes('-')){ // Case: Score includes -
								// Get the apparent scores of the teams
								var userTeamScore = messageArray[3].split('-')[0];
								var otherTeamScore = messageArray[3].split('-')[1];

								// Update teamsMatchesData and write team match to file
								var matchString = (userTeam + "\n-" + otherTeam + " " + userTeamScore + "-" + otherTeamScore);
								if (teamsMatchesData){
									teamsMatchesData += ('\n' + matchString);
								}
								else{
									teamsMatchesData = matchString;
								}
								fs.writeFileSync(teamsMatchesFile, teamsMatchesData, (err) => { 
									if (err) throw err; 
								})

								// Message the captain of the other team about the match
								var otherTeamCaptainTag = getCaptain(otherTeam);
								message.guild.members.cache.forEach(currUser => {
									if (currUser.user.tag == otherTeamCaptainTag){
										// Build embed message to send
										var embeddedMessage = {
											"embed": {
											  "title": otherTeam + " vs " + userTeam,
											  "description": `[${otherTeam}](https://discordapp.com): ${otherTeamScore}\n[${userTeam}](https://discordapp.com): ${userTeamScore}\n${message.author.username} has finalized a match between your teams with the following score. Please confirm or deny the result. Type \"Teams\" in a server chat to view the available commands.`,
											  "color": 160860,
											  "timestamp": message.createdTimestamp,
											  "thumbnail": {
												"url": message.author.avatarURL({format: 'png', size: 1024})
											  }
											}
										  }
										currUser.send(embeddedMessage);
									}
								})
							}else{message.channel.send("[score] must be listed as [Your Team Score]-[Other Team Score] without the []s.");}
						}else{message.channel.send("Your team already has a match against " + existingMatch.split(' ')[0].slice(1) + "(" + existingMatch.split(' ')[1] + ") that you must confirm or deny before creating this one. \nIf this is an error, please contact an Admin.");}
					}else{message.channel.send("Unable to find the team you claim to have beaten.");}
				}else{message.channel.send("You must be in a team to register a win against another team.");}
			}else{message.channel.send("*Teams play [team name] [score]*\t\t - \t\tTrade points with a team you have defeated. **[score] must be listed as [Your Team Score]-[Other Team Score] without the []s**");}
		}
		// Confirm that a match and its score is correct
		else if (messageArrayUpper[1] == "CONFIRM"){
			if (messageArray.length == 3){
				// Verify both teams exist, and user is in the winning team.
				var userTeam = findUserTeam(message.author.tag);// Case: User is in a team
				var otherTeam = teamExistsForFight(messageArrayUpper[2]);
				if (otherTeam == ""){
					message.channel.send("Unable to find team: " + messageArray[2]);
				}
				else{
					// Trade points between the two teams.
					if (userTeam.length > 0){ // Case: User claiming to win, is in a team
						if (otherTeam.length > 0){ // Case: Other team exists
							var existingMatch = findExistingMatch(teamName);
							if (existingMatch){
								var thisTeamScore = existingMatch.split(' ')[1].split('-')[1];
								var otherTeamScore = existingMatch.split(' ')[1].split('-')[0];
								if (parseInt(thisTeamScore) > parseInt(otherTeamScore)){ // The confirming user won the match
									fight(userTeam, otherTeam, message);
								}
								else{ // The team sending the request won the match
									fight(otherTeam, userTeam, message);
								}
							}else{message.channel.send("Unable to find an existing match between your team and the team you have specified.");}
						} else{message.channel.send("Unable to find the team you have specified.");}
					} else{message.channel.send("You are not in a team.");}
				}
			} else{message.channel.send("*Teams confirm [team name]*\t\t - \t\tTrade points with a team you have played.");}
			// @TODO - Case: User has the role to confirm
		}
		// Unknown command
		else{
			message.channel.send("Command not found. Try command \"**teams**\" to list available commands.");
		}
		message.delete(); // Clean chat history
	}
	
})
