
const EL_PATTERNS = {
    "www.wanted.co.kr": `div > a[href="/wd/#{positionId}"]`,
    "jumpit.saramin.co.kr": `a[href="/position/#{positionId}"]`,
    "www.rocketpunch.com": `div[class*="job-card"] > a[href*="/jobs/#{positionId}/"]`,
}

/**
 * Patterns to find company key with positionId
 * TODO implement jumpit, saramin later..
 */
const EL_PATTERNS_COMPANY_KEY = {
    "www.wanted.co.kr": (positionId) => {
        const el = `a[href="/wd/#{positionId}"] button`;
        return document.querySelector(el.replace('#{positionId}', positionId))?.attributes['data-company-id']?.value;
    },
}

const TAG_PARENT_PATTERNS = {
    "www.wanted.co.kr": `a button[data-company-id="#{companyKey}"]`,
    "jumpit.saramin.co.kr": `a div[class="img_box"] > img[alt="#{companyKey}"]`,
    "www.rocketpunch.com": `a[href*="/companies/#{companyKey}"]`,
}
/**
 * 
 * @param {*} site 
 * @param {*} companyKey 
 */
const getTagTargetElements = (site, companyKey) => {
    const tagParentPattern = TAG_PARENT_PATTERNS[site];
    if (!tagParentPattern) {
        throw new Error(`No tag parent pattern found for site: ${site}`);
    }
    const els = document.querySelectorAll(tagParentPattern.replace('#{companyKey}', companyKey));
    if (els && els.length > 0) {
        return els;
    } else {
        console.log(`No tag parent element found for companyKey: ${companyKey}`);
        return null;
    }
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

const addTag = (el, tags, suffix = '') => {
    let tagContainer = el.querySelector(`.wanted-filter-tag-container${suffix}`);
    if (!tagContainer) {
        tagContainer = document.createElement('div');
        tagContainer.className = `wanted-filter-tag-container${suffix}`;
        el.appendChild(tagContainer);
    }
    if (!tags || tags.length === 0) {
        tagContainer.remove();
        return;
    }
    const tobeRemoved = [];
    const foundTags = [];
    const tagEls = el.querySelectorAll(`.wanted-filter-tag${suffix}`);
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
        newTag.className = `wanted-filter-tag${suffix}`;
        newTag.setAttribute('data-tag', tobeCreatedTag);
        newTag.innerText = tobeCreatedTag;
        tagContainer.appendChild(newTag);
    }
}

const TAGGER = {
    "www.wanted.co.kr": (el, tags) => {
        const parentElement = el.parentElement;
        if (parentElement) {
            addTag(parentElement, tags);
        } else {
            console.log(`No parent element found for ${el}`);
        }
    },
    "jumpit.saramin.co.kr": (el, tags) => {
        const parentElement = el.parentElement;
        if (parentElement) {
            addTag(parentElement, tags);
        } else {
            console.log(`No parent element found for ${el}`);
        }
    },
    "www.rocketpunch.com": (el, tags) => {
        const parentElement = el.parentElement?.parentElement;
        if (parentElement) {
            parentElement.style.position = 'relative';
            addTag(parentElement, tags, '-rocketpunch');
        } else {
            console.log(`No parent element found for ${el}`);
        }
    }
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
        for (const companyKey in companyTags) {
            const tags = companyTags[companyKey];
            const els = getTagTargetElements(site, companyKey);
            if (els && els.length > 0) {
                els.forEach((el) => {
                    TAGGER[site]?.(el, tags);
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
        let companyKey;
        if (site === 'www.wanted.co.kr') {
            const companyId = EL_PATTERNS_COMPANY_KEY[site](positionId);
            if (!companyId) {
                console.log(`Cannot find companyId for positionId: ${positionId}`);
                return;
            }
            companyKey = companyId;
        } else if (site === 'jumpit.saramin.co.kr') {
            const companyName = document.querySelector(`a[href="/position/${positionId}"] div.img_box > img`)?.attributes['alt']?.value;
            if (!companyName) {
                console.log(`Cannot find companyName for positionId: ${positionId}`);
                return;
            }
            companyKey = companyName;
        } else {
            // www.rocketpunch.com
            const positionLink = document.querySelector(`a[href*="/jobs/${positionId}"]`);
            if (!positionLink) {
                console.log(`Cannot find position link for positionId: ${positionId}`);
                return;
            }
            const companyLink = positionLink.parentElement?.parentElement?.parentElement?.querySelector(`a[href*="/companies/"]`);
            if (!companyLink) {
                console.log(`Cannot find company link for positionId: ${positionId}`);
                return;
            }
            const companyName = companyLink?.attributes['href']?.value?.split('/')[2];
            if (!companyName) {
                console.log(`Cannot find companyName for positionId: ${positionId}`);
                return;
            }
            companyKey = companyName;
        }

        const localStorageKey = `${site}_companyTags`;
        chrome.storage.local.get([localStorageKey], (result) => {
            const currentTags = result?.[localStorageKey]?.[companyKey]?.join(',') || "";
            const userInput = prompt("Enter new tag for the company(comma separated):", currentTags);
            if (userInput == null) {
                console.log('No user input');
                return;
            }
            const tags = userInput.length == 0 ? undefined : userInput.split(',').map(tag => tag.trim());
            const current = result[localStorageKey] || {};
            current[companyKey] = tags;
            chrome.storage.local.set({ [localStorageKey]: current });
            
            const els = getTagTargetElements(site, companyKey);
            if (els && els.length > 0) {
                els.forEach((el) => {
                    TAGGER[site]?.(el, tags);
                });
            }
        });
    }
});
