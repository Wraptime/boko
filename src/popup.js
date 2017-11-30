// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// chrome.storage = {
//   sync: {
//     get: (x, cb) => { console.log('getting', x); cb({ 'abc' : "[\"existing\"]" }) },
//     set: (x) => { console.log('setting', x) }
//   }
// }
// chrome.tabs = {
//   query: (_x, cb) => { cb([{url: 'abc'}]) }
// }

import Fuse from 'fuse.js'
/**
 * Get the current URL.
 *
 * @param {function(string)} callback called when the URL of the current tab
 *   is found.
 */
async function getCurrentTabUrl() {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  return new Promise((resolve) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      // chrome.tabs.query invokes the callback with a list of tabs that match the
      // query. When the popup is opened, there is certainly a window and at least
      // one tab, so we can safely assume that |tabs| is a non-empty array.
      // A window can only have one active tab at a time, so the array consists of
      // exactly one tab.
      var tab = tabs[0];

      // A tab is a plain object that provides information about the tab.
      // See https://developer.chrome.com/extensions/tabs#type-Tab
      var url = tab.url;

      // tab.url is only available if the "activeTab" permission is declared.
      // If you want to see the URL of other tabs (e.g. after removing active:true
      // from |queryInfo|), then the "tabs" permission is required to see their
      // "url" properties.
      console.assert(typeof url == 'string', 'tab.url should be a string');

      resolve(url);
    })
  })
}

/**
 * Change the background color of the current page.
 *
 * @param {string} color The new background color.
 */
function changeBackgroundColor(color) {
  var script = 'document.body.style.backgroundColor="' + color + '";';
  // See https://developer.chrome.com/extensions/tabs#method-executeScript.
  // chrome.tabs.executeScript allows us to programmatically inject JavaScript
  // into a page. Since we omit the optional first argument "tabId", the script
  // is inserted into the active tab of the current window, which serves as the
  // default.
  chrome.tabs.executeScript({
    code: script
  });
}

/**
 * Gets the saved background color for url.
 *
 * @param {string} url URL whose background color is to be retrieved.
 * @param {function(string)} callback called with the saved background color for
 *     the given url on success, or a falsy value if no color is retrieved.
 */
async function getSavedTags(url) {
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We check
  // for chrome.runtime.lastError to ensure correctness even when the API call
  // fails.
  return new Promise((resolve) => {
    chrome.storage.sync.get(url, (items) => {
      if(!chrome.runtime.lastError) {
        resolve(items[url])
      }
    })
  });
}

/**
 * Sets the given background color for url.
 *
 * @param {string} url URL for which background color is to be saved.
 * @param {string} color The background color to be saved.
 */
async function saveTags(url, tags) {
  const prevItems = new Promise((resolve) => {
    chrome.storage.sync.get(url, (items) => {
      if(!chrome.runtime.lastError) {
        resolve(items || {})
      }
    })
  });
  const items = prevItems
  items[url] = tags;
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We omit the
  // optional callback since we don't need to perform any action once the
  // background color is saved.
  chrome.storage.sync.set(items);
}

// This extension loads the saved background color for the current tab if one
// exists. The user can select a new background color from the dropdown for the
// current page, and it will be saved as part of the extension's isolated
// storage. The chrome.storage API is used for this purpose. This is different
// from the window.localStorage API, which is synchronous and stores data bound
// to a document's origin. Also, using chrome.storage.sync instead of
// chrome.storage.local allows the extension data to be synced across multiple
// user devices.
const TAGS = ['react', 'frontend', 'angular', 'redux', 'functional programming']
const fuse = new Fuse(
  TAGS.map(tag => ({ tag })),
  {
    shouldSort: true,
    includeScore: true,
    location: 0,
    tokenize: true,
    keys: [ 'tag' ]
  }
)

document.addEventListener('DOMContentLoaded', async () => {
  const url = await getCurrentTabUrl()
  console.log('url', url)
  var $tagsSelected = document.getElementById('tags-selected')
  var $tagsInput = document.getElementById('tags-input')
  var $tagsSuggestions = document.getElementById('tags-suggestions')
  var $form = document.getElementById('form')

  let suggestions = []
  let selected = []
  const prevSelected = await getSavedTags(url)
  if(prevSelected) {
    selected = prevSelected
    $tagsSelected.innerHTML = selected.join(' ')
  }

  const setSuggestions = (newSuggestions = []) => {
    suggestions = newSuggestions
    $tagsSuggestions.innerHTML = suggestions.join(' ')
  }
  const addSelected = (newSelected) => {
    selected.push(newSelected)
    $tagsSelected.innerHTML = selected.join(' ')
  }

  $tagsInput.addEventListener('keydown', (e) => {
    const key = e.which || e.keyCode;
    console.log(key)
    if (key === 13) {
      if (suggestions.length) {
        addSelected(suggestions[0])
        setSuggestions([])
        $tagsInput.value = ''
      }
      console.log('preventing')
      e.preventDefault()
      return false
    }
  })

  $tagsInput.addEventListener('input', async () => {
    setSuggestions(
      fuse.search($tagsInput.value)
        .filter(({ score }) => score < 0.5)
        .map(({ item: { tag } }) => tag)
    )

  }, false)


  $form.addEventListener('submit', async () => {
    // const prevTags = await getSavedTags(url)
    saveTags(url, selected)
  })
});
