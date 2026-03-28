//Main Page Listener
document.addEventListener('DOMContentLoaded', () => {
    const trends = document.getElementById('tab-trends');
    const statement = document.getElementById('tab-statement');

    if(trends){ trends.onclick = () => switchTab('trends') }
    if(statement){ statement.onclick = () => switchTab('statement') }

    // Handle Trend Type Toggle (Monthly vs Yearly)
    const trendType = document.getElementById('trend-type');
    const trendYearGroup = document.getElementById('trend-year-group');
    const trendStartYearGroup = document.getElementById('trend-start-year-group');
    const trendEndYearGroup = document.getElementById('trend-end-year-group');
    const trendYear = document.getElementById('trend-year');
    const trendStartYear = document.getElementById('trend-start-year');
    const trendEndYear = document.getElementById('trend-end-year');

    if(trendType) {
        trendType.addEventListener('change', (e) => {
            if(e.target.value === 'monthly') {
                // If Monthly, show only the Year selector
                trendYearGroup.style.display = 'block';
                trendStartYearGroup.style.display = 'none';
                trendEndYearGroup.style.display = 'none';
                
                if(trendYear) trendYear.required = true;
                if(trendStartYear) trendStartYear.required = false;
                if(trendEndYear) trendEndYear.required = false;
                
            } else if (e.target.value === 'yearly') {
                // If Yearly, show Start and End Year selectors
                trendYearGroup.style.display = 'none';
                trendStartYearGroup.style.display = 'block';
                trendEndYearGroup.style.display = 'block';
                
                if(trendYear) trendYear.required = false;
                if(trendStartYear) trendStartYear.required = true;
                if(trendEndYear) trendEndYear.required = true;
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
                const allItems = getAllItems();
                if(trendItem) {
                    // Clear existing options
                    trendItem.innerHTML = '<option value="" disabled selected>Select Item</option>';

                    // Add each item as an option
                    allItems.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.batch_id;
                        option.textContent = item.item_name;
                        trendItem.appendChild(option);
                    });
                }
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

    let salesChartInstance = null; // Store chart globally to destroy before re-rendering

    if(trendsForm) {
        trendsForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent page reload
            
            // Show the results area
            const resultsArea = document.getElementById('trends-results');
            resultsArea.style.display = 'block';

            const trendType = document.getElementById('trend-type').value;
            console.log('Generating trends report...');

            let labels = [];
            let chartData = [];
            let xAxisLabel = '';

            if (trendType === 'monthly') {
                // Monthly trend: X-Axis represents months of a specific year
                const selectedYear = document.getElementById('trend-year').value || 'Selected Year';
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                // sales data for each month
                chartData = getMonthlySalesData(selectedYear);

                console.log('chartData', chartData);
                xAxisLabel = `Months of ${selectedYear}`;
                
            } else if (trendType === 'yearly') {
                // Yearly trend: X-Axis represents a range of specific years
                const start = parseInt(document.getElementById('trend-start-year').value) || 2020;
                const end = parseInt(document.getElementById('trend-end-year').value) || 2026;

                for(let year = start; year <= end; year++) {
                    labels.push(year.toString());
                }
                
                // Yearly sales data for each year in the range
                chartData = getYearlySalesData(start, end);
                console.log('chartData', chartData);
                xAxisLabel = `Years (${start} - ${end})`;
            }

            // Hide placeholder text and show canvas
            document.getElementById('chart-placeholder-text').style.display = 'none';
            const canvas = document.getElementById('salesChart');
            canvas.style.display = 'block';

            const ctx = canvas.getContext('2d');

            // Destroy existing chart if it exists so new data doesn't overlap the old graph
            if (salesChartInstance) {
                salesChartInstance.destroy();
            }

            salesChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Sales',
                        data: chartData,
                        backgroundColor: '#a9d08e', 
                        borderColor: '#28a745',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Sales',
                                color: 'black',
                                font: { weight: 'bold' }
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: xAxisLabel,
                                color: 'black',
                                font: { weight: 'bold' }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        });
    }

    let allSalesData = [];
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
            

            document.getElementById('summary-duration-text').innerText = durationText;
            allSalesData = getItemsSaleData(monthSelect.value, yearInput.value);
            const summarySoldQty = allSalesData.reduce((sum, item) => sum + (item.sold ? item.quantity : 0), 0);
            const summarySoldInc = allSalesData.reduce((sum, item) => sum + (item.sold ? item.income : 0), 0);
            const summarySoldExp = allSalesData.reduce((sum, item) => sum + (item.sold ? item.expenditure : 0), 0);
            const summarySoldTotal = summarySoldInc - summarySoldExp;

            const summaryDiscQty = allSalesData.reduce((sum, item) => sum + (item.sold ? 0 : item.quantity), 0);
            const summaryDiscExp = allSalesData.reduce((sum, item) => sum + (item.sold ? 0 : item.expenditure), 0);
            const summaryNetTotal = summarySoldTotal - summaryDiscExp;
            
            document.getElementById('summary-sold-qty').innerText = `${summarySoldQty}`;
            document.getElementById('summary-sold-inc').innerText = `₹ ${summarySoldInc.toLocaleString()}`;
            document.getElementById('summary-sold-total').innerText = `₹ ${summarySoldTotal.toLocaleString()}`;
            document.getElementById('summary-sold-exp').innerText = `₹ ${summarySoldExp.toLocaleString()}`;
            document.getElementById('summary-disc-qty').innerText = `${summaryDiscQty}`;
            document.getElementById('summary-disc-exp').innerText = `₹ ${summaryDiscExp.toLocaleString()}`;
            document.getElementById('summary-disc-total').innerText = `-₹ ${summaryDiscExp.toLocaleString()}`;
            
            document.getElementById('summary-net-total').innerText = `₹ ${summaryNetTotal.toLocaleString()}`;

            // Handle Detailed Statement Item Filtering
            const detailedItemFilter = document.getElementById('detailed-item-filter');
            if (detailedItemFilter) {
                detailedItemFilter.innerHTML = '<option value="all">All Items</option>'; // Reset and add 'All Items'
                const uniqueItems = [...new Map(allSalesData.map(item => [item.batch_id, item])).values()];
                uniqueItems.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.batch_id;
                    option.textContent = item.item_name;
                    detailedItemFilter.appendChild(option);
                });

                detailedItemFilter.addEventListener('change', (e) => {
                    renderDetailedStatement(allSalesData, e.target.value);
                });

                // Initial render for "All Items"
                renderDetailedStatement(allSalesData, 'all');
            }
        });
    }

    // Handle Report Downloads
    const downloadTrendsBtn = document.getElementById('download-trends-btn');
    const downloadStatementBtn = document.getElementById('download-statement-btn');

    if(downloadTrendsBtn) {
        downloadTrendsBtn.addEventListener('click', () => {
            alert("Downloading Sales Trends Report");
            //TODO: Implement actual download functionality
        });
    }

    if(downloadStatementBtn) {
        downloadStatementBtn.addEventListener('click', () => {
            alert("Downloading Profit/Loss Statement.");
            //TODO: Implement actual download functionality 
        });
    }

});

function renderDetailedStatement(salesData, selectedBatchId) {
    const itemGroup = document.getElementById('detailed-statement-table');

    const existingRows = itemGroup.querySelectorAll('tbody');
    existingRows.forEach(row => row.remove());
    const filteredData = selectedBatchId === 'all' 
        ? salesData 
        : salesData.filter(item => item.batch_id === selectedBatchId);

    // Group by item_name to handle sold and discarded states for the same item
    const itemsByName = filteredData.reduce((acc, item) => {
        if (!acc[item.item_name]) {
            acc[item.item_name] = {
                sold_qty: 0,
                sold_exp: 0,
                sold_inc: 0,
                disc_qty: 0,
                disc_exp: 0,
            };
        }

        if (item.sold) {
            acc[item.item_name].sold_qty += item.quantity;
            acc[item.item_name].sold_exp += item.expenditure;
            acc[item.item_name].sold_inc += item.income;
        } else {
            acc[item.item_name].disc_qty += item.quantity;
            acc[item.item_name].disc_exp += item.expenditure;
        }
        
        return acc;
    }, {});

    for (const itemName in itemsByName) {
        const item = itemsByName[itemName];
        const soldTotal = item.sold_inc - item.sold_exp;
        const netTotal = soldTotal - item.disc_exp;

        const row = document.createElement('tbody');
        row.classList.add('detailed-item-group');
        row.dataset.itemName = itemName;
        row.innerHTML = `
            <tr>
                <td rowspan="2">${itemName}</td>
                <td>Sold</td>
                <td>${item.sold_qty}</td>
                <td>₹ ${item.sold_exp.toLocaleString()}</td>
                <td>₹ ${item.sold_inc.toLocaleString()}</td>
                <td style="color: #28a745; font-weight:bold;">₹ ${soldTotal.toLocaleString()}</td>
                <td rowspan="2">₹ ${netTotal.toLocaleString()}</td>
            </tr>
            <tr>
                <td>Discarded</td>
                <td>${item.disc_qty}</td>
                <td>₹ ${item.disc_exp.toLocaleString()}</td>
                <td>-</td>
                <td style="color: #dc3545; font-weight:bold;">-₹ ${item.disc_exp.toLocaleString()}</td>
            </tr>
        `;
        itemGroup.appendChild(row);
    }
}

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

    // Clear form inputs when switching tabs
    const trendsForm = document.getElementById('trends-form');
    const statementForm = document.getElementById('statement-form');
    if(trendsForm) trendsForm.reset();
    if(statementForm) statementForm.reset();

    // Reset scope specific and dynamic display groups
    const productNameGroup = document.getElementById('product-name-group');
    if(productNameGroup) productNameGroup.style.display = 'none';
    
    const trendYearGroup = document.getElementById('trend-year-group');
    if(trendYearGroup) trendYearGroup.style.display = 'none';

    const trendStartYearGroup = document.getElementById('trend-start-year-group');
    if(trendStartYearGroup) trendStartYearGroup.style.display = 'none';

    const trendEndYearGroup = document.getElementById('trend-end-year-group');
    if(trendEndYearGroup) trendEndYearGroup.style.display = 'none';

    // Set new active states
    if(tabName === 'trends') {
        trends.classList.add('active');
        trends_v.style.display = 'block';

    } else if (tabName === 'statement') {
        statement.classList.add('active');
        statement_v.style.display = 'block';
    }
}

function getMonthlySalesData(year) {
    //TODO: fetch data from server
    //Output: [{month: sales}, {month: sales}, ...]
    //Example: [ { Jan: 12000 }, { Feb: 15000 }, ...]

    //dummy data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const salesData = {};
    months.forEach(month => {
        salesData[month] = Math.floor(Math.random() * 15000) + 5000; // Random sales between 5000 and 20000
    });
    return salesData;
}

function getYearlySalesData(startYear, endYear) {
    //TODO: fetch data from server
    //Output: {year: sales, year: sales, ...}
    //Example: { 2020: 150000, 2021: 200000,} 

    //dummy data 
    const yearsCount = endYear - startYear + 1;
    let salesData = {};
    const sales = Array.from({ length: yearsCount }, () => Math.floor(Math.random() * 400000) + 100000);
    sales.map((sale, index) => {
        const year = startYear + index;
        salesData[year] = sale;
    });
    console.log('salesData', salesData);
    return salesData;
}

function getAllItems(){
    //TODO: Implement functionality to fetch all items
    //Output: [{batch_id: 'BATCH001', item_name: 'Item A'}, {batch_id: 'BATCH002', item_name: 'Item B'}, ...]

    //dummy data 
    return [
        {
            batch_id: 'BATCH001',
            item_name: 'Item A',
        },
        {
            batch_id: 'BATCH002',
            item_name: 'Item B',    
        },
    ]
}

function getItemsSaleData(month, year){
    //TODO: Implement functionality to fetch item sale data for a specific month and year
    //Output: [{batch_id: 'BATCH001', item_name: 'Item A', month: 'Jan', year: 2023, sold: 1 || 0,  quantity: 100, expenditure: 500, income: 1000},...]

    //dummy data
    return [
        {
            batch_id: 'BATCH001',
            item_name: 'Item A',
            month: 'Jan',
            year: 2023,
            sold: 1,
            quantity: 100,
            expenditure: 500,
            income: 1000
        },
        {
            batch_id: 'BATCH002',
            item_name: 'Item B',
            month: 'Jan',
            year: 2023,
            sold: 0,
            quantity: 150,
            expenditure: 750,
            income: 1500
        }
    ]
}