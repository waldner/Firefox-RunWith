function receiveText(request, sender, sendResponse) {
  console.log('Received text for editable: %s', request.text);
  let element = browser.menus.getTargetElement(request.elementId);
  element.value += request.text;

  // trigger change for some stupid js frameworks
  // which would otherwise not recognize the input
  let evt = new Event('change');
  element.dispatchEvent(evt);
}
browser.runtime.onMessage.addListener(receiveText);
