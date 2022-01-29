function createTableRow(data){

  var contexts = [ 'link', 'selection', 'image', 'editable', 'page' ];

  var tr = document.createElement('tr');

  var input = document.createElement('input');
  input.type = 'text';
  input.name = 'menu_title';
  input.style.width = '100%';
  if (data) {
    input.value = data.title;
  }
  input.placeholder = 'Menu text';
  input.required = true;
  tr.insertCell().appendChild(input);

  var input = document.createElement('input');
  input.type = 'text';
  input.name = 'nm_host';
  input.style.width = '100%';
   if (data) {
    input.value = data.nmhost;
  }
  input.placeholder = 'NM Host';
  input.required = true;
  tr.insertCell().appendChild(input);

  var select = document.createElement('select');    
  select.require = true;
  select.style.width = '100%';
  select.className = "browser-style";

  for (var j = 0; j < contexts.length; j++) {
    var option = document.createElement("option");
    option.value = contexts[j];
    option.text = contexts[j];
    if (data) {
      if (data.contexts.includes(contexts[j])){
        option.selected = true;
      }
    } else {
      if (j == 0){
        option.selected = true;
      }
    }
    select.appendChild(option);
  }
  tr.insertCell().appendChild(select);

  var input = document.createElement('input');
  input.type = 'text';
  input.name = 'command';
  input.style.width = '100%';
  if (data) {
    input.value = data.action.join(',');
  }
  input.placeholder = 'Command to run';
  input.required = true;
  tr.insertCell().appendChild(input);

  var input = document.createElement('input');
  input.type = 'checkbox';
  input.name = 'shell';
  input.style.width = '100%';
  input.checked = false;
  if (data) {
    input.checked = data.shell;
  }
  tr.insertCell().appendChild(input);

  var input = document.createElement('input');
  input.type = 'checkbox';
  input.name = 'wait';
  input.style.width = '100%';
  input.checked = true;
  if (data) {
    input.checked = data.wait;
  }
  tr.insertCell().appendChild(input);

  var deleteButton = createButton("Delete", "deleteButton", function(){
    deleteRow(tr)
  }, false);

  tr.insertCell().appendChild(deleteButton);

  return tr;
}

async function populateDOM(config, overwrite) {

  if (! config) {
    let backgroundPage = browser.extension.getBackgroundPage();
    config = await backgroundPage.loadConfig();
  }

  conf = config.config;

  console.log('conf is: ' + JSON.stringify(conf));

  var mainTable = document.getElementById('mainTable');
  mainTable.style.width = "90%"; 

  var mainTableHead = document.getElementById('mainTableHead');
  var mainTableBody = document.getElementById('mainTableBody');

  mainTable.style.border = '2px solid black';

  mainTableHead.innerHTML = '';

  if (overwrite) {
    mainTableBody.innerHTML = '';
  }

  mainTableHead.style.backgroundColor = 'LightGreen';

  // header
  var tr = mainTableHead.insertRow();

  tr.style.fontWeight = 'bold';
  tr.style.fontSize = '120%';

  var cell = tr.insertCell();
  cell.style.width = "15%";
  cell.align = "center";
  cell.appendChild(document.createTextNode('Menu title'));

  var cell = tr.insertCell();
  cell.style.width = "10%";
  cell.align = "center";
  cell.appendChild(document.createTextNode('NM host'));

  var cell = tr.insertCell();
  cell.style.width = "13%";
  cell.align = "center";
  cell.appendChild(document.createTextNode('Context'));

  var cell = tr.insertCell();
  cell.style.width = "45%";
  cell.align = "center";
  cell.appendChild(document.createTextNode('Command'));

  var cell = tr.insertCell();
  cell.style.width = "5%";
  cell.align = "center";
  cell.appendChild(document.createTextNode('Shell'));

  var cell = tr.insertCell();
  cell.style.width = "5%";
  cell.align = "center";
  cell.appendChild(document.createTextNode('Wait'));

  var cell = tr.insertCell();
  cell.style.width = "7%";
  cell.align = "center";
  cell.appendChild(document.createTextNode('Delete'));

  for (var i = 0; i < conf.conf.length; i++) {
    var tr = createTableRow(conf.conf[i]);
    mainTableBody.appendChild(tr);
  }

}

function deleteRow(rowTr) {
  var mainTableBody = document.getElementById('mainTableBody');
  mainTableBody.removeChild(rowTr);
}

function newItem(){
  var mainTableBody = document.getElementById('mainTableBody');
  var tr = createTableRow(null);
  mainTableBody.appendChild(tr);
}

var fadeTimer = null;

function fadeOut(element) {
  var opacity = 1;

  if (fadeTimer){
    clearInterval(fadeTimer);
  }

  fadeTimer = setInterval(function() {
    if (opacity <= 0){
      clearInterval(fadeTimer);
    }
    element.style.opacity = opacity;
    opacity -= 0.01;
  }, 50);
}

function notify(text){
  notificationDiv = document.getElementById('notification');
  notificationDiv.textContent = text;
  fadeOut(notificationDiv);
}

async function saveOrExportConfig(e){

  if (e.preventDefault) e.preventDefault();

  var config = collectConfig();

  if (document.activeElement.getAttribute('value') === "exportButton") {
    exportConfig(config);
  } else {
    // real save
    await saveConfig(config);
    let backgroundPage = browser.extension.getBackgroundPage();
    await backgroundPage.loadConfAndApply();

    notify('Configuration saved');
  }

  // You must return false to prevent the default form behavior
  return false;
}

function saveConfig(config){
  console.log("Saving configuration: " + JSON.stringify(config));
  browser.storage.local.set(config);
}

function collectConfig(){

  // collect configuration from DOM
  mainTableBody = document.getElementById('mainTableBody');

  var config = { config: { conf: [] } }

  for (var row = 0; row < mainTableBody.rows.length; row++){

    var elem = {}

    elem.id = row.toString();

    // menu title
    elem.title = mainTableBody.rows[row].cells[0].childNodes[0].value;

    // NM host
    elem.nmhost = mainTableBody.rows[row].cells[1].childNodes[0].value;

    // context
    var contexts = [];
    var options = mainTableBody.rows[row].cells[2].childNodes[0].options;
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      if (opt.selected) {
        contexts.push(opt.value);
      }
    }
    elem.contexts = contexts;

    // command
    elem.action = mainTableBody.rows[row].cells[3].childNodes[0].value.split(/ *, */);

    // shell
    elem.shell = mainTableBody.rows[row].cells[4].childNodes[0].checked;

    // wait
    elem.wait = mainTableBody.rows[row].cells[5].childNodes[0].checked;

    config.config.conf.push(elem);
  }

  console.log("Collected config: " + JSON.stringify(config));

  return config;

}

function exportConfig(config){

  var dl = document.createElement('a');
  var content = JSON.stringify(config);
  dl.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(content));
  dl.setAttribute('download', 'runwith_config.json');

  dl.setAttribute('visibility', 'hidden');
  dl.setAttribute('display', 'none');  
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
}

function importConfig(evt){

  var overwrite = true;
  if (evt.target.id === 'importAddButton'){
    overwrite = false;
  }

  var input = document.createElement('input');
  input.type = 'file';
  input.addEventListener("change", function(evt){

    var file = this.files[0];

    var reader = new FileReader();
    reader.onload = async function(e) {
      try {
        var config = JSON.parse(reader.result);
        console.log("Will overwrite shown configuration: " + overwrite);
        await populateDOM(config, overwrite);
        notify('Configuration imported (not saved)');
      } catch(e) {
        console.log('error loading file: ' + e);
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

function createButton(text, id, callback, submit){

  var span = document.createElement('span');
  var button = document.createElement('button');
  button.id = id;

  button.textContent = text;
  button.className = "browser-style";

  if (submit) {
    button.type = "submit";
  } else {
    button.type = "button";
  }

  button.name = id;
  button.value = id;
  button.addEventListener("click", callback);

  span.appendChild(button);

  return span;
}


function init(){
  populateDOM(null, true);

  var form = document.getElementById('mainForm');

  var p = document.createElement('p');

  var newItemButton = createButton("New item", "newItemButton", newItem, false);
  newItemButton.style.marginRight = '10px';

  var exportButton = createButton("Export", "exportButton", function(){}, true);
  exportButton.style.marginRight = '10px';

  var importReplaceButton = createButton("Import (replace)", "importReplaceButton", importConfig, false);
  importReplaceButton.style.marginRight = '10px';

  var importAddButton = createButton("Import (add)", "importAddButton", importConfig, false);
  importAddButton.style.marginRight = '10px';

  var saveButton = createButton("Save", "saveButton", function(){}, true);

  p.appendChild(newItemButton);
  p.appendChild(exportButton);
  p.appendChild(importReplaceButton);
  p.appendChild(importAddButton);
  p.appendChild(saveButton);

  form.appendChild(p);

  form.addEventListener('submit', saveOrExportConfig);
}

document.addEventListener('DOMContentLoaded', init);
