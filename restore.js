document.getElementById('restore-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            restoreData(data);
        };
        reader.readAsText(file);
    } else {
        window.alert('Please select a file to restore.');
    }
});

function restoreData(data) {
    chrome.storage.local.set(data, () => {
        console.log('restored data', data);
        window.alert('Data restored successfully!');
        window.close();
    });
}
