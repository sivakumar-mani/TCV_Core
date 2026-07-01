(function () {
  var localHosts = ['localhost', '127.0.0.1', '::1'];
  var isLocal = localHosts.indexOf(window.location.hostname) !== -1;

  window.APP_CONFIG = {
    apiUrl: isLocal ? 'http://localhost:8080/api' : 'http://timecablevision.in/api',
  };
})();
