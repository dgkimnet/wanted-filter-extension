const POSITION_PATTERNS = [
    /https:\/\/www\.wanted\.co.kr\/wd\/(\d+)/,
    /https:\/\/jumpit\.saramin\.co\.kr\/position\/(\d+)/,
    /https:\/\/www\.rocketpunch\.com\/jobs\/(\d+)\/.*/
]

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "addToList",
        title: "Add this to the list",
        contexts: ["all"]
    });
    chrome.contextMenus.create({
        id: "removeFromList",
        title: "Remove this from the list",
        contexts: ["all"]
    });
    chrome.contextMenus.create({
        id: "backup",
        title: "Backup",
        contexts: ["all"]
    })
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'backup') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                console.log('context menu called backup');
                chrome.runtime.sendMessage({
                    action: "backup",
                });
            },
            args: [],
        });
        return;
    }

    const { linkUrl } = info;
    if (!linkUrl ||
        !POSITION_PATTERNS.some(pattern => pattern.test(linkUrl))
    ) {
        console.log('not a position link', linkUrl);
        return;
    }

    const site = linkUrl.split('/')[2];
    // const positionId = linkUrl.split('/').pop();
    const positionId = POSITION_PATTERNS.reduce((acc, pattern) => {
        const match = linkUrl.match(pattern);
        if (match) {
            return match[1];
        }
        return acc;
    }, null);
    if (info.menuItemId === "addToList") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (site, linkUrl, positionId) => {
                console.log('context menu called', linkUrl, positionId);
                if (positionId) {
                    chrome.runtime.sendMessage({
                        action: "savePositionId",
                        site,
                        positionId,
                    });
                }
            },
            args: [site, linkUrl, positionId],
        });
    } else if (info.menuItemId === "removeFromList") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (site, linkUrl, positionId) => {
                console.log('context menu called', linkUrl, positionId);
                if (positionId) {
                    chrome.runtime.sendMessage({
                        action: "removePositionId",
                        site,
                        positionId,
                    });
                }
            },
            args: [site, linkUrl, positionId],
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('message', message);
    const site = message.site;
    const localStorageKey = `${site}_positionIds`;
    if (message.action == 'savePositionId') {
        chrome.storage.local.get([localStorageKey], (result) => {
            const current = result[localStorageKey] || [];
            if (!current.includes(message.positionId)) {
                current.push(message.positionId);
                chrome.storage.local.set({ [localStorageKey]: current });
            }
        });

        chrome.tabs.sendMessage(sender.tab.id, {
            action: "updateHighLights",
            positionId: message.positionId,
            onOff: true,
        });
    } else if (message.action == 'removePositionId') {
        chrome.storage.local.get([localStorageKey], (result) => {
            const current = result[localStorageKey] || [];
            if (current.includes(message.positionId)) {
                const newPositionIds = current.filter(id => id !== message.positionId);
                chrome.storage.local.set({ [localStorageKey]: newPositionIds });
            }
        });

        chrome.tabs.sendMessage(sender.tab.id, {
            action: "updateHighLights",
            positionId: message.positionId,
            onOff: false,
        });
    } else if (message.action == 'backup') {
        // download local storage as JSON file
        chrome.tabs.sendMessage(sender.tab.id, {
            action: "download",
        });
    }
});
