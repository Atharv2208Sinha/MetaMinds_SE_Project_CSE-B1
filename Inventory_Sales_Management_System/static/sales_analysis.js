//Main Page Listener
document.addEventListener('DOMContentLoaded', () => {
    const trends = document.getElementById('tab-trends');
    const statement = document.getElementById('tab-statement');

    if(trends){ trends.onclick = () => switchTab('trends') }
    if(statement){ statement.onclick = () => switchTab('statement') }
});

function switchTab(tabName) {
    // Reset active states
    const trends = document.getElementById('tab-trends');
    const statement = document.getElementById('tab-statement');
    const trends_v = document.getElementById('trends-view');
    const statement_v = document.getElementById('statement-view');

    trends.classList.remove('active');
    statement.classList.remove('active');
    trends_v.style.display = 'none';
    statement_v.style.display = 'none'


    // Set new active states
    if(tabName === 'trends') {
        trends.classList.add('active');
        trends_v.style.display = 'block';

    } else if (tabName === 'statement') {
        statement.classList.add('active');
        statement_v.style.display = 'block';
    }
}