COMPONENTS.Discord = {
	_name = "base",
	RichPresence = function(self)
		SetDiscordAppId(COMPONENTS.Convar.DISCORD_APP.value)
		SetDiscordRichPresenceAsset("logotypeshit")
		SetDiscordRichPresenceAssetText("Join Today: Content Coast RP")
		--SetDiscordRichPresenceAssetSmall("info")
		SetDiscordRichPresenceAction(0, "Join Our Discord", "https://discord.gg/n3JtV8xEt7")

		CreateThread(function()
			while true do
				local char = LocalPlayer.state.Character
				local playerCount = GlobalState["PlayerCount"] or 0
				local queueCount = GlobalState["QueueCount"] or 0
				if char ~= nil then
					SetRichPresence(
						string.format(
							"%d/%d Players - Playing %s %s",
							playerCount,
							GlobalState.MaxPlayers,
							char:GetData("First"),
							char:GetData("Last")
						)
					)
				else
					SetRichPresence(
						string.format("%d/%d Players - Selecting a Character", playerCount, GlobalState.MaxPlayers)
					)
				end

				-- SetDiscordRichPresenceAssetSmallText(
				-- 	string.format("%s/%s [Queue: %s]", playerCount, GlobalState.MaxPlayers, queueCount)
				-- )
				Wait(30000)
			end
		end)
	end,
}

CreateThread(function()
	COMPONENTS.Discord:RichPresence()
end)
