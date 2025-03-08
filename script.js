document.addEventListener('DOMContentLoaded', async () => {
    const fundDropdown = document.getElementById('fundDropdown');
    const classDropdown = document.getElementById('classDropdown');
    const timePeriodDropdown = document.getElementById('timePeriodDropdown');
    const addFundButton = document.querySelector('.add-fund');
    const comparingSection = document.querySelector('.comparing-section');
    const clearAllButton = document.querySelector('.clear-all');
    const getHistoryButton = document.querySelector('.get-history');
    const historyTableContainer = document.getElementById('historyTableContainer');
    const historyTable = document.getElementById('historyTable');

    let selectedFunds = [];
    const MAX_FUNDS = 5;

    // Verify that we found all dropdown elements
    if (!fundDropdown || !classDropdown || !timePeriodDropdown) {
        console.error('Could not find one or more dropdown elements:',
            { fundDropdown, classDropdown, timePeriodDropdown });
        return;
    }

    try {
        console.log('Attempting to fetch reportjson.json...');
        const response = await fetch('reportjson.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Successfully loaded JSON data:', data);

        // Clear existing options
        fundDropdown.innerHTML = '<option value="">Select A Fund</option>';
        classDropdown.innerHTML = '<option value="">Class</option>';
        timePeriodDropdown.innerHTML = '<option value="">Select Time Period</option>';

        // Populate fund dropdown
        if (data.Funds && Array.isArray(data.Funds)) {
            console.log(`Adding ${data.Funds.length} funds to dropdown`);
            data.Funds.forEach(fund => {
                const option = document.createElement('option');
                option.value = fund.FundId;
                option.textContent = fund.FundName;
                fundDropdown.appendChild(option);
            });
        } else {
            console.error('Invalid data structure - Funds array not found:', data);
        }

        // Handle fund selection to populate share classes
        fundDropdown.addEventListener('change', function() {
            classDropdown.innerHTML = '<option value="">Class</option>';
            const selectedFund = data.Funds.find(fund => fund.FundId === this.value);
            
            if (selectedFund && selectedFund.ShareClasses) {
                console.log(`Loading ${selectedFund.ShareClasses.length} share classes for fund:`, selectedFund.FundName);
                selectedFund.ShareClasses.forEach(shareClass => {
                    const option = document.createElement('option');
                    option.value = shareClass.FundClassId;
                    option.textContent = `Class ${shareClass.ClassName}`;
                    classDropdown.appendChild(option);
                });
            }
        });

        // Handle Get History button click
        getHistoryButton.addEventListener('click', async () => {
            if (selectedFunds.length === 0) {
                alert('Please select at least one fund to view history');
                return;
            }

            try {
                console.log('Fetching historical data...');
                const response = await fetch('data.json'); // Updated to match lowercase filename
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const historicalData = await response.json();
                console.log('Historical data loaded:', historicalData);

                if (!historicalData.data || !Array.isArray(historicalData.data)) {
                    throw new Error('Invalid historical data format');
                }

                // Update table headers
                const headerRow = historyTable.querySelector('thead tr');
                headerRow.innerHTML = '<th>Date</th>'; // Reset headers
                selectedFunds.forEach(fund => {
                    const th = document.createElement('th');
                    th.textContent = fund.name;
                    headerRow.appendChild(th);
                });

                // Create table body
                const tbody = historyTable.querySelector('tbody');
                tbody.innerHTML = ''; // Clear existing rows

                // Sort dates in descending order
                historicalData.data.sort((a, b) => new Date(b.AsOfDateFormatted) - new Date(a.AsOfDateFormatted));

                // Create rows for each date
                historicalData.data.forEach(dateData => {
                    const tr = document.createElement('tr');
                    
                    // Add date cell
                    const dateCell = document.createElement('td');
                    dateCell.textContent = formatDate(dateData.AsOfDateStr);
                    tr.appendChild(dateCell);

                    // Add value cells for each selected fund
                    selectedFunds.forEach(fund => {
                        const td = document.createElement('td');
                        const returnData = dateData.Returns.find(r => 
                            r.FundClassId.toString() === fund.classId
                        );
                        const value = returnData ? returnData.Return : '-';
                        td.textContent = typeof value === 'number' ? value.toFixed(2) : value;
                        tr.appendChild(td);
                    });

                    tbody.appendChild(tr);
                });

                // Show the table container
                historyTableContainer.style.display = 'block';

            } catch (error) {
                console.error('Error loading historical data:', error);
                alert('Failed to load historical data. Please check the browser console for details (Press F12 to open developer tools).');
            }
        });

        // Handle Add Fund button click
        addFundButton.addEventListener('click', () => {
            const selectedFundId = fundDropdown.value;
            const selectedClassId = classDropdown.value;
            
            if (!selectedFundId || !selectedClassId) {
                alert('Please select both a fund and a share class');
                return;
            }

            if (selectedFunds.length >= MAX_FUNDS) {
                alert('You can select up to 5 funds only');
                return;
            }

            const selectedFund = data.Funds.find(fund => fund.FundId === selectedFundId);
            const selectedClass = selectedFund.ShareClasses.find(shareClass => 
                shareClass.FundClassId === selectedClassId
            );

            const fundInfo = {
                id: `${selectedFundId}-${selectedClassId}`,
                fundId: selectedFundId,
                classId: selectedClassId,
                name: `${selectedFund.FundName} Class ${selectedClass.ClassName}`
            };

            // Check if fund is already selected
            if (selectedFunds.some(fund => fund.id === fundInfo.id)) {
                alert('This fund and share class combination is already selected');
                return;
            }

            selectedFunds.push(fundInfo);
            updateComparingSection();

            // Reset dropdowns
            fundDropdown.value = '';
            classDropdown.innerHTML = '<option value="">Class</option>';
        });

        // Handle Clear All button click
        clearAllButton.addEventListener('click', (e) => {
            e.preventDefault();
            selectedFunds = [];
            updateComparingSection();
            historyTableContainer.style.display = 'none';
        });

        function formatDate(dateStr) {
            return dateStr; // The date is already in the desired format (M/D/YYYY)
        }

        function updateComparingSection() {
            // Clear existing fund tags (except the header and clear all link)
            const existingTags = comparingSection.querySelectorAll('.fund-tag');
            existingTags.forEach(tag => tag.remove());

            // Add new fund tags
            selectedFunds.forEach(fund => {
                const fundTag = document.createElement('div');
                fundTag.className = 'fund-tag';
                fundTag.innerHTML = `
                    <span>${fund.name}</span>
                    <button class="remove-fund" data-fund-id="${fund.id}">×</button>
                `;
                comparingSection.insertBefore(fundTag, clearAllButton);

                // Add click handler for remove button
                fundTag.querySelector('.remove-fund').addEventListener('click', () => {
                    selectedFunds = selectedFunds.filter(f => f.id !== fund.id);
                    updateComparingSection();
                    if (selectedFunds.length === 0) {
                        historyTableContainer.style.display = 'none';
                    }
                });
            });

            // Show/hide clear all link based on whether there are selected funds
            clearAllButton.style.display = selectedFunds.length ? 'inline' : 'none';
        }

        // Add predefined time periods
        const timePeriods = [
            { value: '1M', label: '1 Month' },
            { value: '3M', label: '3 Months' },
            { value: '6M', label: '6 Months' },
            { value: '1Y', label: '1 Year' },
            { value: '3Y', label: '3 Years' },
            { value: '5Y', label: '5 Years' },
            { value: 'YTD', label: 'Year to Date' }
        ];

        timePeriods.forEach(period => {
            const option = document.createElement('option');
            option.value = period.value;
            option.textContent = period.label;
            timePeriodDropdown.appendChild(option);
        });

    } catch (error) {
        console.error('Detailed error:', {
            message: error.message,
            stack: error.stack,
            error: error
        });
        alert('Failed to load dropdown data. Please check the browser console for details (Press F12 to open developer tools).');
    }
});
