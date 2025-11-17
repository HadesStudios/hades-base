-- Heartbeat: start after watermark is sent

local HEARTBEAT_INTERVAL_MS = 60 * 1000 -- 60s
local HEARTBEAT_WARN_MS = 2000

local function startHeartbeat()
    print('[script:hades-base] Heartbeat: starting timers (interval='..HEARTBEAT_INTERVAL_MS..'ms)')
    CreateThread(function()
        while true do
            local t0 = os.clock()
            -- perform the heartbeat work here (simple log for now)
            local ok, err = pcall(function()
                print('[script:hades-base] [heartbeet] successful')
            end)
            if not ok then
                print('[script:hades-base] [heartbeet] failed: '..tostring(err))
            end

            local dt = (os.clock() - t0) * 1000
            if dt > HEARTBEAT_WARN_MS then
                print(string.format('[script:hades-base] Heartbeat work slow: %dms', math.floor(dt)))
            end
            Wait(HEARTBEAT_INTERVAL_MS)
        end
    end)
end

RegisterNetEvent('Core:Shared:Watermark')
AddEventHandler('Core:Shared:Watermark', function()
    -- start heartbeat timers shortly after watermark
    CreateThread(function()
        Wait(1000)
        startHeartbeat()
    end)
end)
