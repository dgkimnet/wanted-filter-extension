document.getElementById('restore-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            // Assuming you have a function to handle the restoration process
            restoreData(data);
        };
        reader.readAsText(file);
    } else {
        alert('Please select a file to restore.');
    }
});

function restoreData(data) {
    // Implement your data restoration logic here
    chrome.storage.local.set(data, () => {
        console.log('restored data', data);
        window.alert('Data restored successfully!');
        window.close();
    });
}
