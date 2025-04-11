
const EL_PATTERNS = {
    "www.wanted.co.kr": `div > a[data-position-id="#{positionId}"]`,
    "jumpit.saramin.co.kr": `a[href="/position/#{positionId}"]`,
    "www.rocketpunch.com": `div[class*="job-card"] > a[href*="/jobs/#{positionId}/"]`,
}

const STYLER = {
    "www.wanted.co.kr": (el, addStyle) => {
        if (addStyle) {
            el.parentElement?.classList?.add('highlight-wanted');
        } else {
            el.parentElement?.classList?.remove('highlight-wanted');
        }
    },
    "jumpit.saramin.co.kr": (el, addStyle) => {
        if (addStyle) {
            el.parentElement?.classList?.add('highlight-jumpit');
        } else {
            el.parentElement?.classList?.remove('highlight-jumpit');
        }
    },
    "www.rocketpunch.com": (el, addStyle) => {
        if (addStyle) {
            el.parentElement?.classList?.add('highlight-rocketpunch');
        } else {
            el.parentElement?.classList?.remove('highlight-rocketpunch');
        }
    },
}

const debounce = (func, delay) => {
    let timeoutId;
    return function(...args) {
        if (timeoutId) {
            // console.log('clearing timeout', timeoutId);
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
        // console.log('setting timeout', timeoutId);
    };
}

const highlightSavedItems = () => {
    const site = window.location.hostname;
    const localStorageKey = `${site}_positionIds`;
    chrome.storage.local.get(localStorageKey, (response) => {
        if (!response[localStorageKey]) return;
    
        response[localStorageKey].forEach((positionId) => {
            const els = document.querySelectorAll(EL_PATTERNS[site].replace('#{positionId}', positionId));

            if (els && els.length > 0) {
                els.forEach((el) => {
                    console.log(`highlighting positionId: ${positionId}`);
                    STYLER[site](el, true);
                });
                // el.classList.add('highlight');
            } else {
                console.log(`positionId: ${positionId} not found`);
            }
        });
    });
}

const debouncedHighlightSavedItems = debounce(highlightSavedItems, 1000);

// Initial call
// highlightSavedItems();
debouncedHighlightSavedItems();

// Observe future DOM updates
const observer = new MutationObserver(() => {
    // highlightSavedItems();
    debouncedHighlightSavedItems();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// document.querySelectorAll('a[data-position-id]').forEach((el, index) => {
//     if (!el.id) {
//         el.id = `position-link-${index}`;
//     }

//     el.addEventListener('contextmenu', () => {
//         console.log('context menu called', el.id);
//         chrome.runtime?.sendMessage?.( { elementId: el.id });
//     });
// });

// message listner
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('message received', request);
    const site = window.location.hostname;
    if (request.action === "updateHighLights") {
        const { positionId, onOff } = request;
        const els = document.querySelectorAll(EL_PATTERNS[window.location.hostname].replace('#{positionId}', positionId));

        if (els && els.length > 0) {
            els.forEach((el) => {
                STYLER[site](el, onOff);
            });
        }
    } else if (request.action === 'download') {
        console.log('download action received');
        chrome.storage.local.get(null, (result) => {
            console.log('local storage result', result);
            const blob = new Blob([JSON.stringify(result, null, 2)]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wanted-filter-extension.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
});
