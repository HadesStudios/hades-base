-- builder cmds

RegisterCommand('builder:rebuild', function(source, args, raw)
  if source ~= 0 then print('console only') return end
  local res = args[1]
  if not res then print('usage: builder:rebuild <hades-resource>') return end
  local targetPath = GetResourcePath(res)
  if not targetPath or targetPath == '' then print('resource not found: '..res) return end

    -- prefer the streamed hades-base builder when present so the command works on any install
    local basePath = GetResourcePath('hades-base')
    local root = nil
    if basePath and basePath ~= '' then root = basePath else root = GetResourcePath(GetCurrentResourceName()) end

    -- normalize separators and collapse duplicate slashes
    root = string.gsub(root, '\\\\', '/')
    root = string.gsub(root, '/+', '/')

    local nodeScript = root .. '/builder/js/rebuild.js'

    -- normalize script path
    nodeScript = string.gsub(nodeScript, '\\', '/')
    nodeScript = string.gsub(nodeScript, '/+', '/')

    -- ensure logs folder exists, then pick a console log path
    local logsDir = root .. '/builder/logs'
    logsDir = string.gsub(logsDir, '\\', '/')
    logsDir = string.gsub(logsDir, '/+', '/')
    -- mkdir (works on Windows and *nix in most servers)
    os.execute(('mkdir "%s"'):format(logsDir))
    local consoleLog = ('%s/%s_console_%d.log'):format(logsDir, res, os.time())

    -- helper: check file exists
    local function file_exists(path)
      local f = io.open(path, 'r')
      if f then f:close() return true end
      return false
    end

    -- discover UI candidates inside the resource
    local uiCandidates = {'ui', 'html', 'client/html', 'ui/dist', 'www', 'web'}
    local uiPath = nil
    for _, cand in ipairs(uiCandidates) do
      local p = targetPath .. '/' .. cand
      p = string.gsub(p, '\\', '/')
      p = string.gsub(p, '/+', '/')
      if file_exists(p .. '/package.json') then uiPath = p break end
    end

    -- don't auto-install or run package managers from the server console.
    -- Instead always invoke the Node-based builder script (keeps behavior predictable).
    local ok = false
    local nodeCandidates = {
      'node',
      'node.exe',
      '"C:\\Program Files\\nodejs\\node.exe"',
      '"C:\\Program Files (x86)\\nodejs\\node.exe"',
    }
    for _, nodeCmd in ipairs(nodeCandidates) do
      -- pass the absolute resource path as second arg so the Node script doesn't have to infer it
      local targetArg = targetPath
      targetArg = string.gsub(targetArg, '\\', '/')
      targetArg = string.gsub(targetArg, '/+', '/')
      local cmd = ('%s "%s" %s "%s" > "%s" 2>&1'):format(nodeCmd, nodeScript, res, targetArg, consoleLog)
      print('trying: '..cmd)
      local rc = os.execute(cmd)
      if rc == 0 then ok = true break end
    end

    if ok then print('rebuild done for '..res..' (log: '..consoleLog..')') else print('rebuild failed for '..res..' (log: '..consoleLog..')') end
end, true)
