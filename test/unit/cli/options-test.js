var proxyquire = require('proxyquire').noCallThru()
var simple = require('simple-mock')
var test = require('tap').test

function createYargsMock (argv) {
  var yargsApi = {argv: argv}

  ;[
    'alias',
    'env',
    'epilogue',
    'help',
    'options',
    'showHelpOnFail',
    'version',
    'terminalWidth',
    'wrap'
  ].forEach(function (key) {
    simple.mock(yargsApi, key).returnWith(yargsApi)
  })

  return yargsApi
}

function mockAppDefaults () {
  return function () {
    return {
      public: 'app-default-public',
      port: 'app-default-port',
      address: 'localhost'
    }
  }
}

var packageJsonMock = {
  version: '1.0.0'
}

function createCliOptionsProxy (yargsApi) {
  return proxyquire('../../../cli/options', {
    'npmlog': { warn: simple.spy() },
    './hoodie-defaults': function () {
      return {
        port: 'hoodie-default-port',
        public: 'hoodie-default-public',
        dbUrl: 'hoodie-default-dbUrl',
        address: 'hoodie-localhost'
      }
    },
    './app-defaults': mockAppDefaults(),
    'yargs': yargsApi,
    '../package.json': packageJsonMock
  })
}

test('config', function (group) {
  var yargsApi = createYargsMock({ port: 'cli-port' })
  var getCliOptions = createCliOptionsProxy(yargsApi)

  group.test('config order', function (t) {
    var options = getCliOptions('project-path')
    var cliOptions = yargsApi.options.lastCall.arg

    t.is(cliOptions.public.default, 'app-default-public', 'App defaults override hoodie defaults')
    t.is(cliOptions.dbUrl.default, 'hoodie-default-dbUrl', 'Falls back to Hoodie defaults')
    t.is(options.port, 'cli-port', 'returns options from yargs')

    t.end()
  })

  group.test('version', function (t) {
    var versionFunc = yargsApi.version.lastCall.arg

    simple.mock(console, 'log', simple.spy())
    simple.mock(process, 'exit', simple.spy())

    versionFunc()

    t.is(console.log.lastCall.arg, packageJsonMock.version, 'Prints version-field of package.json')
    t.is(process.exit.lastCall.arg, 0, 'calls process.exit with status 0 to exit gracefully')

    simple.restore(console, 'log')
    simple.restore(process, 'exit')
    t.end()
  })

  group.test('version error', function (t) {
    var versionFunc = yargsApi.version.lastCall.arg

    simple.mock(console, 'log', simple.spy().throwWith(new Error()))
    simple.mock(process, 'exit', simple.spy())

    versionFunc()

    t.is(process.exit.lastCall.arg, 1, 'calls process.exit with status 1 to show that an error occured')

    simple.restore(console, 'log')
    simple.restore(process, 'exit')
    t.end()
  })

  group.end()
})

test('bindAddress', function (t) {
  var getCliOptions = createCliOptionsProxy(createYargsMock({ bindAddress: '0.0.0.0' }))

  var options = getCliOptions('project-path')

  t.is(options.address, '0.0.0.0', 'is replaced with address')

  t.end()
})
