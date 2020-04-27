TopCaliber Teams Bot
====================
This Discord Bot allows for creation of teams between players in a discord server. When a team is created, the team is given a category channel with a default list of channels. The bot keeps track of the members of the team, and uses this information to maintain access to these channels. If all members of a team leave, the channels are deleted.<br/><br/>

Show all commands.<br/>
{ } shows a command parameter is optional.<br/>
```
teams								Help menu
teams create [team name]    					Create a new team
teams invite [user]						Add a user to the user's current team
teams revoke [user]						Revoke an invite to your current team for user.
teams leave							Leave your current team.
teams join 							Join a team. (requires invite)
teams points							Display the user's teams' points.
teams points {team name}					Check the points of a specific team.
teams top {number of teams} 					Check the top teams with their points.
teams roster {team name}					List the players on a given roster.
teams play teamName [user's team]-[other team]			Send a message for confirmation to the other team.
teams confirm teamName						Confirm that a game with the listed score occured.
teams deny teamName						Deny that a game with the listed score occured.
teams pending {games}						View all pending match results with other teams.
```
The bot will remove its output from its commands, if typed correctly, in order to prevent spam. Also to reduce spam, the bot will show the current ranked queue after each command typed, but will then be automatically removed after 5 minutes.<br/><br/>


Control of the bot
====================

node index.js - Start locally<br/>

- Linux Server 
	<br/></t>Use the following commands through SSH to start the bot: 
	<br/></t>Start and persist through SSH: node index.js > console_error.txt > console_output.txt &
	<br/></t>Look at active background processes: ps -ax | grep node
	<br/></t>Kill the process running in the background: kill -9 {ProcessNum}
		<br/></t></t>Obtain the {ProcessNum} after looking at the active background processes.
	<br/></t>Use "Exit" when finished, before closing console.


Installation
====================
This bot uses DiscordAPI v12.<br/>
How to get a token: https://www.writebots.com/discord-bot-token/<br/>

*If you're using this bot on your own, you will need the following.*<br/><br/>

__config.json__ in this format:<br/>
```json
{
	"prefix": "TEAMS",
	"token": "token"
}
```

A folder named **data** in the root directory to contain all the teams information with the following names:<br/>
- team-invites.txt<br/>
- team-matches.txt<br/>
- team-points.txt<br/>
- team-roster.txt<br/>
- teams.txt<br/>
