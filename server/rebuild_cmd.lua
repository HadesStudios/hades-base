-- here easy building dumbass dev

RegisterCommand('rebuild', function(source, args, raw)
  if source ~= 0 then
    print('console only')
    return
  end

  local res = args[1]
  if not res or type(res) ~= 'string' then
    print('usage: rebuild <hades-resource-name>')
    return
  end

  if not string.match(res, '^hades%-') then
    print('resource must start with hades-')
    return
  end

  -- check ui
  local pkg = LoadResourceFile(res, 'ui/package.json')
  if not pkg then
    print('no ui/package.json found for '..res)
    return
  end

  local resPath = GetResourcePath(res)
  if not resPath or resPath == '' then
    print('failed to get resource path for '..res)
    return
  end

  local uiPath = resPath .. '/ui'
  print('rebuilding '..res..' ui at '..uiPath)
  -- log file inside this resource so it streams with the resource
  local resourceRoot = GetResourcePath(GetCurrentResourceName())
  local logsDir = resourceRoot .. '/logs'
  -- try both mkdir forms to be cross-platform
  os.execute(('mkdir -p "%s" 2> /dev/null || mkdir "%s"'):format(logsDir, logsDir))
  local stamp = tostring(os.time())
  local safe = res:gsub('[^%w%-%_]', '_')
  local logFile = ('%s/%s_build_%s.log'):format(logsDir, safe, stamp)
  -- run Node helper from resource root so node's cwd is this resource (logs will go into logs/ here)
  local nodeScript = resourceRoot .. '/rebuild-ui.js'
  local cmd = ('cd "%s" && node "%s" %s'):format(resourceRoot, nodeScript, res)
  print('exec: '..cmd)

  local ok = os.execute(cmd)
  if ok == 0 then
    print('rebuild command completed for '..res..'  log='..logFile)
  else
    print('rebuild command failed for '..res..'  log='..logFile)
  end
end, true)
