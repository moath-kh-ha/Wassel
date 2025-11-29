(function(){
  // Minimal placeholder for element SDK. Expand if your app expects more.
  window.elementSdk = {
    ready() { return Promise.resolve({ isOk: true }); }
  };
  console.info('Mock elementSdk loaded', !!window.elementSdk);
})();
