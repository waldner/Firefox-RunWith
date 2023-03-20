
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

function actionFunc(action, nmhost, context, shell, wait, info, tab){

  var realAction = []
 
  action.forEach(function(act){
    var word = act;

    word = word.replace('%%LINK%%', info.linkUrl || "");
    word = word.replace('%%SELECTION%%', info.selectionText || "");
    word = word.replace('%%IMAGE%%', info.srcUrl || "");
    word = word.replace('%%TAB-URL%%', tab.url || "");
    word = word.replace('%%TAB-TITLE%%', tab.title || "");
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
    const id = await createMenuItem(config.conf[i]);
    console.log("Menu item created, id " + id);
    let j = i;
    callbacks[id] = function(info, tab){
      actionFunc(config.conf[j].action, config.conf[j].nmhost, config.conf[j].contexts[0], config.conf[j].shell, config.conf[j].wait, info, tab);
    }
  }

  listener = function(info, tab) {
    if (callbacks[info.menuItemId]) {
      callbacks[info.menuItemId](info, tab);
    }
  }
 
  await browser.menus.onClicked.addListener(listener);

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

