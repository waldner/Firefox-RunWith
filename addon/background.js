
var callbacks;
var listener;

function removeMenuItems(){
  return browser.menus.removeAll();
}

function removeListener(result){
  if (listener){
    return browser.menus.onClicked.removeListener(listener)
  } else {
    return 0;
  }
}

function onNmResponse(response){
  console.log("NM Response: %o", response);
}

function onNmError(error){
  console.log("NM Error: %o", error);
}

function actionFunc(action, nmhost, context, shell, wait, info, tab, evt){

  console.log("actionFunc being invoked with context " + context + " and evt: " + evt);

  var realAction = [];
 
  action.forEach(function(act){
    var word = act;

    if (context != "navigation") {
      word = word.replace('%%LINK%%', info.linkUrl || "");
      word = word.replace('%%SELECTION%%', info.selectionText || "");
      word = word.replace('%%IMAGE%%', info.srcUrl || "");
      word = word.replace('%%TAB-URL%%', tab.url || "");
      word = word.replace('%%TAB-TITLE%%', tab.title || "");
    } else {
      word = word.replace('%%LINK%%', evt.url);
      word = word.replace('%%TAB-ID%%', evt.tabId);
      word = word.replace('%%PROCESS-ID%%', evt.processId);
    }
    realAction.push(word);
  });

  if (context == "editable") {
    wait = true;
  }

  var msg = {
    cmd: realAction,
    shell: shell,
    wait: wait
  }

  console.log('About to run: %s', JSON.stringify(msg));
  var sending = browser.runtime.sendNativeMessage(nmhost, msg);
  sending.then(function(response){
    if (context == "editable") {
      let stdout = response.stdout;
      stdout.replace(/\n+$/, "")
      browser.tabs.sendMessage(tab.id, {text: stdout, elementId: info.targetElementId});
    }
    onNmResponse(response)
  }, onNmError);

}

function createMenuItem(item){

  var menuProps = {
    id: item.id,
    title: item.title,
    contexts: item.contexts,
  }

  if (item.documentUrlPatterns) {
    menuProps.documentUrlPatterns = item.documentUrlPatterns;
  }

  if (item.contexts[0] == "link" || item.contexts[0] == "image") {
    console.log("targetUrlPatterns " + item.targetUrlPatterns);
    if (item.targetUrlPatterns) {
      menuProps.targetUrlPatterns = item.targetUrlPatterns;
    }
  }

  var id = browser.menus.create(menuProps);
  return id;
}

async function addMenusAndListener(config){

  callbacks = {};

  for (var i = 0; i < config.conf.length; i++) {
    let j = i;
    if (config.conf[i].contexts[0] != "navigation") {
      // normal menu
      const id = await createMenuItem(config.conf[i]);
      console.log("Menu item created, id " + id);
      callbacks[id] = function(info, tab){
        actionFunc(config.conf[j].action, config.conf[j].nmhost, config.conf[j].contexts[0], config.conf[j].shell, config.conf[j].wait, info, tab, null);
      }
    } else {
      // navigation listener
     let navListener = function(evt){
        // only run on top-level context and not for about: pages
        if (evt.frameId == 0 && (!evt.url.match(/^(about|moz-extension):/))) {
          actionFunc(config.conf[j].action, config.conf[j].nmhost, config.conf[j].contexts[0], config.conf[j].shell, config.conf[j].wait, null, null, evt);
        }
      }
      console.log("Adding navigation listener:" + JSON.stringify(config.conf[j].action));
      var urlFilter = [{urlMatches: ".*"}];
      if (config.conf[j].targetUrlPatterns.length > 1 ||
           (config.conf[j].targetUrlPatterns.length == 1 &&
           config.conf[j].targetUrlPatterns[0] != "<all_urls>")) {
        urlFilter = [];
        for (let i = 0; i < config.conf[j].targetUrlPatterns.length; i++) {
          urlFilter.push({urlMatches: config.conf[j].targetUrlPatterns[i]});
        }
      }
      let filter = { url: urlFilter };
      console.log("Filter for navigation listener is:" + JSON.stringify(filter));
      await browser.webNavigation.onCommitted.addListener(navListener, filter);
    }
  }

  if (Object.keys(callbacks).length > 0) {
    menuListener = function(info, tab) {
      if (callbacks[info.menuItemId]) {
        callbacks[info.menuItemId](info, tab);
      }
    }
    await browser.menus.onClicked.addListener(menuListener);
  }

  return 0;
}

async function loadConfig(){

  var config;

  config = await browser.storage.local.get("config");

  if (JSON.stringify(config) === '{}') {
    console.log("Configuration not found, using empty one");
    config = { config: { conf: [] } };
  }

  return config;

}

async function setCurrentConf(config) {

  conf = config.config;

  const p1 = removeMenuItems();
  const p2 = removeListener();
  await p1; await p2;
  await addMenusAndListener(conf);

  return 0;

}

async function loadConfAndApply(){

  try {
    const config = await loadConfig();
    console.log("Loaded configuration is " + JSON.stringify(config));
    const result = await setCurrentConf(config);
    console.log("Setting options done, result is: " + await result);
  } catch (error) {
    console.log('Setting options failed', error);
  }

}

loadConfAndApply();

