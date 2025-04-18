
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

const TAGGER = {
    "www.wanted.co.kr": (el, tags, addTag) => {
        if (addTag) {
            let tagContainer = el.querySelector('.wanted-filter-tag-container');
            if (!tagContainer) {
                tagContainer = document.createElement('div');
                tagContainer.className = 'wanted-filter-tag-container';
                el.appendChild(tagContainer);
            }
            const tobeRemoved = [];
            const foundTags = [];
            const tagEls = el.querySelectorAll('.wanted-filter-tag');
            for (const tagEl of tagEls) {
                const tagName = tagEl.getAttribute('data-tag');
                if (!tags.includes(tagName)) {
                    tobeRemoved.push(tagEl);
                    continue;
                } else {
                    foundTags.push(tagName);
                }
            }
            for (const tagEl of tobeRemoved) {
                tagEl.remove();
            }
            for (const tobeCreatedTag of tags) {
                if (foundTags.includes(tobeCreatedTag)) continue;
                const newTag = document.createElement('span');
                newTag.className = 'wanted-filter-tag';
                newTag.setAttribute('data-tag', tobeCreatedTag);
                newTag.innerText = tobeCreatedTag;
                tagContainer.appendChild(newTag);
            }
        } else {
            const tagContainer = el.querySelector('.wanted-filter-tag-container');
            if (tagContainer) {
                tagContainer.remove();
            }
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

    chrome.storage.local.get([`${site}_companyTags`], (result) => {
        const companyTags = result[`${site}_companyTags`] || {};
        for (const companyId in companyTags) {
            const tags = companyTags[companyId];
            const els = document.querySelectorAll(`a[data-company-id="${companyId}"] img`);
            if (els && els.length > 0) {
                els.forEach((el) => {
                    TAGGER[site]?.(el.parentElement, tags, true);
                });
            }
        }
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
    } else if (request.action === 'editTagOfCompany') {
        console.log('edit tag of company', request);
        const { positionId } = request;
        const companyId = document.querySelector(`a[data-position-id="${positionId}"]`)?.attributes['data-company-id']?.value;
        if (!companyId) {
            console.log(`Cannot find companyId for positionId: ${positionId}`);
            return;
        }
        const localStorageKey = `${site}_companyTags`;
        chrome.storage.local.get([localStorageKey], (result) => {
            const currentTags = result?.[companyId]?.join(',') || "";
            const userInput = prompt("Enter new tag for the company(comma separated):", currentTags);
            const tags = userInput.split(',').map(tag => tag.trim());
            const current = result[localStorageKey] || {};
            current[companyId] = tags;
            chrome.storage.local.set({ [localStorageKey]: current });
            const els = document.querySelectorAll(`a[data-company-id="${companyId}"] img`);
            if (els && els.length > 0) {
                els.forEach((el) => {
                    TAGGER[site]?.(el.parentElement, tags, true);
                });
            }
        });
    }
});
