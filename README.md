TopCaliber Teams Bot
====================
This Discord Bot allows for creation of teams between players in a discord server. When a team is created, the team is given a category channel with a default list of channels. The bot keeps track of the members of the team, and uses this information to maintain access to these channels. If all members of a team leave, the channels are deleted.<br/><br/>

Show all commands<br/>
    {} shows a command parameter is optional<br/>
    === Commands List === <br/>
        teams								</t></t></t> Help menu<br/>
	teams create [team name]    					</t></t></t></t> Create a new team<br/>
	teams invite [user]						</t></t></t>Add a user to the user's current team<br/>
	teams revoke [user]						</t></t> Revoke an invite to your current team for user.<br/>
	teams leave							</t></t></t> Leave your current team.<br/>
	teams join 							</t></t></t> Join a team. (requires invite)<br/>
	teams points							</t></t></t> Display the user's teams' points.<br/>
	teams points {team name}					</t></t> Check the points of a specific team.<br/>
	teams top {number of teams} 					</t></t> Check the top teams with their points.<br/>
	teams roster {team name}					</t></t> List the players on a given roster.<br/>
	teams play teamName [user's team]-[other team]			</t> Send a message for confirmation to the other team.<br/>
	teams confirm teamName						</t></t> Confirm that a game with the listed score occured.<br/>
	teams deny teamName						</t></t></t> Deny that a game with the listed score occured.<br/>
	teams pending {games}						</t></t></t> View all pending match results with other teams.<br/>

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

How to get a token: https://www.writebots.com/discord-bot-token/<br/>

*If you're using this bot on your own, you will need to setup your own config.json in this format:*

```json
{
	"prefix": "TEAMS",
	"token": "token"
}
```
