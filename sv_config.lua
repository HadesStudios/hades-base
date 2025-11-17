COMPONENTS.Config = {
	Discord = {
		Server = "1343021946320851026",
	},
	Groups = {},
	Server = {
		ID = os.time(),
		Name = "Server Name",
		Access = GetConvar('sv_access_role', 0),
	}
	,
	Telemetry = {
		Enabled = true, -- enabled by default; set to false to disable sending heartbeats
		Endpoint = "https://api.hadescfx.studio/", -- base endpoint for telemetry
	}
}
