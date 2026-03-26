//Main Page Listener
document.addEventListener('DOMContentLoaded', () => {
    const trends = document.getElementById('tab-trends');
    const statement = document.getElementById('tab-statement');

    if(trends){ trends.onclick = () => switchTab('trends') }
    if(statement){ statement.onclick = () => switchTab('statement') }

    // Handle Trend Type Toggle (Monthly vs Yearly)
    const trendType = document.getElementById('trend-type');
    const trendMonthGroup = document.getElementById('trend-month-group');
    const trendYearGroup = document.getElementById('trend-year-group');
    const trendMonth = document.getElementById('trend-month');
    const trendYear = document.getElementById('trend-year');

    if(trendType) {
        trendType.addEventListener('change', (e) => {
            if(e.target.value === 'monthly') {
                // If Monthly, show both Month and Year selectors
                trendMonthGroup.style.display = 'block';
                trendYearGroup.style.display = 'block';
                if(trendMonth) trendMonth.required = true;
                if(trendYear) trendYear.required = true;
            } else if (e.target.value === 'yearly') {
                // If Yearly, only show the Year selector
                trendMonthGroup.style.display = 'none';
                trendYearGroup.style.display = 'block';
                if(trendMonth) trendMonth.required = false;
                if(trendYear) trendYear.required = true;
            }
        });
    }

    // Handle Trend Scope Toggle (Overall vs Specific Product)
    const trendScope = document.getElementById('trend-scope');
    const productNameGroup = document.getElementById('product-name-group');
    const trendItem = document.getElementById('trend-item');

    if(trendScope) {
        trendScope.addEventListener('change', (e) => {
            if(e.target.value === 'specific') {
                productNameGroup.style.display = 'block';
                if(trendItem) trendItem.required = true;
            } else {
                productNameGroup.style.display = 'none';
                if(trendItem) trendItem.required = false;
            }
        });
    }

    // Handle Forms Submissions
    const trendsForm = document.getElementById('trends-form');
    const statementForm = document.getElementById('statement-form');

    if(trendsForm) {
        trendsForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent page reload
            
            // Show the results area
            const resultsArea = document.getElementById('trends-results');
            resultsArea.style.display = 'block';

            // Fetch simulated data based on user input
            console.log('Generating trends report...');
        });
    }

    if(statementForm) {
        statementForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent page reload

            // Show the results area
            const resultsArea = document.getElementById('statement-results');
            resultsArea.style.display = 'block';

            console.log('Generating profit/loss statement...');
            
            // Get selected duration for the table
            const monthSelect = document.getElementById('statement-month');
            const yearInput = document.getElementById('statement-year');
            const durationText = monthSelect.value && yearInput.value 
                ? `${monthSelect.options[monthSelect.selectedIndex].text} ${yearInput.value}`
                : 'Selected Duration';
            
            // Placeholder simulation of setting fetched data in the Duration table
            document.getElementById('summary-duration-text').innerText = durationText;
            
            document.getElementById('summary-sold-qty').innerText = '500';
            document.getElementById('summary-sold-inc').innerText = '₹ 1,25,000';
            document.getElementById('summary-sold-total').innerText = '₹ 1,25,000';
            
            document.getElementById('summary-disc-qty').innerText = '50';
            document.getElementById('summary-disc-exp').innerText = '₹ 80,000';
            document.getElementById('summary-disc-total').innerText = '-₹ 80,000';
            
            document.getElementById('summary-net-total').innerText = '₹ 45,000';
        });
    }

    // Handle Report Downloads (SRS Postcondition)
    const downloadTrendsBtn = document.getElementById('download-trends-btn');
    const downloadStatementBtn = document.getElementById('download-statement-btn');

    if(downloadTrendsBtn) {
        downloadTrendsBtn.addEventListener('click', () => {
            alert("Downloading Sales Trends Report. You can now share this with your CA or business advisor.");
        });
    }

    if(downloadStatementBtn) {
        downloadStatementBtn.addEventListener('click', () => {
            alert("Downloading Profit/Loss Statement. You can now share this with your CA or business advisor.");
        });
    }

    // Handle Detailed Statement Item Filtering
    const detailedItemFilter = document.getElementById('detailed-item-filter');
    if (detailedItemFilter) {
        detailedItemFilter.addEventListener('change', (e) => {
            const selectedItem = e.target.value;
            const itemGroups = document.querySelectorAll('.detailed-item-group');
            
            itemGroups.forEach(group => {
                if (selectedItem === 'all' || group.getAttribute('data-item') === selectedItem) {
                    group.style.display = ''; // Show this item's body
                } else {
                    group.style.display = 'none'; // Hide this item's body
                }
            });
        });
    }
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
    statement_v.style.display = 'none';

    // Hide results when switching tabs
    document.getElementById('trends-results').style.display = 'none';
    document.getElementById('statement-results').style.display = 'none';

    // Clear form inputs when switching tabs (Optional but clean UX)
    const trendsForm = document.getElementById('trends-form');
    const statementForm = document.getElementById('statement-form');
    if(trendsForm) trendsForm.reset();
    if(statementForm) statementForm.reset();

    // Reset scope specific and dynamic display groups
    const productNameGroup = document.getElementById('product-name-group');
    if(productNameGroup) productNameGroup.style.display = 'none';
    
    const trendMonthGroup = document.getElementById('trend-month-group');
    if(trendMonthGroup) trendMonthGroup.style.display = 'none';
    
    const trendYearGroup = document.getElementById('trend-year-group');
    if(trendYearGroup) trendYearGroup.style.display = 'none';

    // Set new active states
    if(tabName === 'trends') {
        trends.classList.add('active');
        trends_v.style.display = 'block';

    } else if (tabName === 'statement') {
        statement.classList.add('active');
        statement_v.style.display = 'block';
    }
}