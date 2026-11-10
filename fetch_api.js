const https = require('https');

https.get('https://api.myqurani.com/api/v1/Courses?Page=1&PageSize=5', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const items = json.data || json.items || json.courses || json;
            if (Array.isArray(items) && items.length > 0) {
                console.log(JSON.stringify(items[0], null, 2));
            } else {
                console.log("Empty or unrecognized format:", data.substring(0, 200));
            }
        } catch(e) {
            console.error("Parse error", e);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
