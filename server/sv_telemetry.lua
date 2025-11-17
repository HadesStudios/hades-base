local Config = COMPONENTS.Config

if not Config or not Config.Telemetry then
    return
end

local function getPlayerCount()
    local players = GetNumPlayerIndices and GetNumPlayerIndices() or #GetPlayers()
    return tonumber(players) or 0
end

Citizen.CreateThread(function()
    if not Config.Telemetry.Enabled then
        return
    end

    -- Hardcoded heartbeat interval (client-side) to avoid accidental edits breaking telemetry
    local interval = 60 * 1000 -- 60 seconds
    local endpoint = (Config.Telemetry.Endpoint or 'https://api.HadesCFX.studio'):gsub("/$", "")
    local serverID = tostring(Config.Server.ID or os.time())
    local name = Config.Server.Name or GetConvar('sv_hostname', 'unknown')

    while true do
        local payload = json.encode({ serverID = serverID, name = name, players = getPlayerCount() })
        local ok, status, text = pcall(function()
            PerformHttpRequest(endpoint .. '/heartbeat', function(code, res, headers) end, 'POST', payload, { ['Content-Type'] = 'application/json' })
        end)

        Wait(interval)
    end
end)
