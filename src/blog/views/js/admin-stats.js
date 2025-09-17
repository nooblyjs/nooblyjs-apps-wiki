// Admin Stats Interface
class AdminStatsApp {
    constructor() {
        this.currentDateRange = 30;
        this.chartInstance = null;
        this.initializeStats();
        this.setupEventListeners();
        this.loadStatsData();
    }

    initializeStats() {
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.dateRangeSelect = document.getElementById('dateRangeSelect');

        // Overview elements
        this.totalViewsEl = document.getElementById('totalViews');
        this.totalReadersEl = document.getElementById('totalReaders');
        this.readTimeEl = document.getElementById('readTime');
        this.totalClapsEl = document.getElementById('totalClaps');

        this.viewsChangeEl = document.getElementById('viewsChange');
        this.readersChangeEl = document.getElementById('readersChange');
        this.readTimeChangeEl = document.getElementById('readTimeChange');
        this.clapsChangeEl = document.getElementById('clapsChange');

        // Chart elements
        this.viewsChartCanvas = document.getElementById('viewsChartCanvas');
        this.topStoriesEl = document.getElementById('topStories');

        // Table elements
        this.performanceTableBody = document.getElementById('performanceTableBody');
        this.referrersListEl = document.getElementById('referrersList');

        // Insights elements
        this.countryInsightsEl = document.getElementById('countryInsights');
        this.readingTimesChartEl = document.getElementById('readingTimesChart');
        this.popularTagsEl = document.getElementById('popularTags');
        this.growthMetricsEl = document.getElementById('growthMetrics');
    }

    setupEventListeners() {
        this.dateRangeSelect.addEventListener('change', (e) => {
            this.currentDateRange = parseInt(e.target.value);
            this.loadStatsData();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortStoryPerformance(e.target.value);
        });
    }

    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    async loadStatsData() {
        this.showLoading();

        try {
            // Fetch all stats data in parallel
            const [overview, chartData, topStories, performance, referrers, insights] = await Promise.all([
                this.fetchOverviewStats(),
                this.fetchChartData(),
                this.fetchTopStories(),
                this.fetchStoryPerformance(),
                this.fetchReferrers(),
                this.fetchAudienceInsights()
            ]);

            // Update all sections
            this.updateOverviewCards(overview);
            this.updateChart(chartData);
            this.updateTopStories(topStories);
            this.updatePerformanceTable(performance);
            this.updateReferrers(referrers);
            this.updateAudienceInsights(insights);

        } catch (error) {
            console.error('Error loading stats data:', error);
            this.showError('Failed to load stats data');
        } finally {
            this.hideLoading();
        }
    }

    async fetchOverviewStats() {
        try {
            const response = await fetch(`/api/blog/stats/overview?days=${this.currentDateRange}`);
            if (!response.ok) throw new Error('Failed to fetch overview stats');
            return await response.json();
        } catch (error) {
            console.error('Error fetching overview stats:', error);
            return this.getMockOverviewStats();
        }
    }

    async fetchChartData() {
        try {
            const response = await fetch(`/api/blog/stats/chart?days=${this.currentDateRange}`);
            if (!response.ok) throw new Error('Failed to fetch chart data');
            return await response.json();
        } catch (error) {
            console.error('Error fetching chart data:', error);
            return this.getMockChartData();
        }
    }

    async fetchTopStories() {
        try {
            const response = await fetch(`/api/blog/stats/top-stories?days=${this.currentDateRange}&limit=5`);
            if (!response.ok) throw new Error('Failed to fetch top stories');
            return await response.json();
        } catch (error) {
            console.error('Error fetching top stories:', error);
            return this.getMockTopStories();
        }
    }

    async fetchStoryPerformance() {
        try {
            const response = await fetch(`/api/blog/stats/performance?days=${this.currentDateRange}`);
            if (!response.ok) throw new Error('Failed to fetch story performance');
            return await response.json();
        } catch (error) {
            console.error('Error fetching story performance:', error);
            return this.getMockStoryPerformance();
        }
    }

    async fetchReferrers() {
        try {
            const response = await fetch(`/api/blog/stats/referrers?days=${this.currentDateRange}`);
            if (!response.ok) throw new Error('Failed to fetch referrers');
            return await response.json();
        } catch (error) {
            console.error('Error fetching referrers:', error);
            return this.getMockReferrers();
        }
    }

    async fetchAudienceInsights() {
        try {
            const response = await fetch(`/api/blog/stats/insights?days=${this.currentDateRange}`);
            if (!response.ok) throw new Error('Failed to fetch audience insights');
            return await response.json();
        } catch (error) {
            console.error('Error fetching audience insights:', error);
            return this.getMockAudienceInsights();
        }
    }

    updateOverviewCards(data) {
        this.totalViewsEl.textContent = this.formatNumber(data.totalViews);
        this.totalReadersEl.textContent = this.formatNumber(data.totalReaders);
        this.readTimeEl.textContent = this.formatReadTime(data.totalReadTime);
        this.totalClapsEl.textContent = this.formatNumber(data.totalClaps);

        this.updateChangeIndicator(this.viewsChangeEl, data.viewsChange);
        this.updateChangeIndicator(this.readersChangeEl, data.readersChange);
        this.updateChangeIndicator(this.readTimeChangeEl, data.readTimeChange);
        this.updateChangeIndicator(this.clapsChangeEl, data.clapsChange);
    }

    updateChangeIndicator(element, change) {
        const isPositive = change >= 0;
        element.textContent = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;
        element.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
    }

    updateChart(data) {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = this.viewsChartCanvas.getContext('2d');

        // Create a simple line chart (you could use Chart.js for more advanced charts)
        this.drawLineChart(ctx, data);
    }

    drawLineChart(ctx, data) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (!data.dates || data.dates.length === 0) return;

        // Find max values for scaling
        const maxViews = Math.max(...data.views);
        const maxReads = Math.max(...data.reads);
        const maxValue = Math.max(maxViews, maxReads);

        // Draw grid lines
        ctx.strokeStyle = '#f2f2f2';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 5; i++) {
            const y = padding + (height - 2 * padding) * i / 5;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw views line
        this.drawDataLine(ctx, data.views, maxValue, '#1a8917', width, height, padding);

        // Draw reads line
        this.drawDataLine(ctx, data.reads, maxValue, '#6b6b6b', width, height, padding);

        // Draw labels
        this.drawChartLabels(ctx, data.dates, maxValue, width, height, padding);
    }

    drawDataLine(ctx, dataPoints, maxValue, color, width, height, padding) {
        if (dataPoints.length === 0) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const stepX = (width - 2 * padding) / (dataPoints.length - 1);

        dataPoints.forEach((value, index) => {
            const x = padding + index * stepX;
            const y = height - padding - (value / maxValue) * (height - 2 * padding);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw points
        ctx.fillStyle = color;
        dataPoints.forEach((value, index) => {
            const x = padding + index * stepX;
            const y = height - padding - (value / maxValue) * (height - 2 * padding);

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    drawChartLabels(ctx, dates, maxValue, width, height, padding) {
        ctx.fillStyle = '#6b6b6b';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';

        // X-axis labels (dates)
        const stepX = (width - 2 * padding) / (dates.length - 1);
        dates.forEach((date, index) => {
            if (index % Math.ceil(dates.length / 6) === 0) { // Show every nth label
                const x = padding + index * stepX;
                const y = height - padding + 20;
                ctx.fillText(this.formatChartDate(date), x, y);
            }
        });

        // Y-axis labels (values)
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = (maxValue * (5 - i)) / 5;
            const y = padding + (height - 2 * padding) * i / 5 + 4;
            ctx.fillText(this.formatNumber(value), padding - 10, y);
        }
    }

    updateTopStories(stories) {
        this.topStoriesEl.innerHTML = stories.map((story, index) => `
            <div class="top-story-item">
                <div class="story-rank">${index + 1}</div>
                <div class="story-info">
                    <div class="story-title">${story.title}</div>
                    <div class="story-stats">${this.formatNumber(story.views)} views</div>
                </div>
            </div>
        `).join('');
    }

    updatePerformanceTable(stories) {
        this.performanceTableBody.innerHTML = stories.map(story => `
            <tr>
                <td class="story-cell">
                    <div class="story-title">${story.title}</div>
                    <div class="story-date">${this.formatDate(story.publishedAt)}</div>
                </td>
                <td class="metric-value">${this.formatNumber(story.views)}</td>
                <td class="metric-value">${this.formatNumber(story.reads)}</td>
                <td class="read-ratio">${story.readRatio.toFixed(1)}%</td>
                <td class="metric-value">${this.formatNumber(story.claps)}</td>
                <td class="metric-value">${this.formatNumber(story.comments)}</td>
                <td>${this.formatDate(story.publishedAt)}</td>
            </tr>
        `).join('');
    }

    updateReferrers(referrers) {
        this.referrersListEl.innerHTML = referrers.map(referrer => `
            <div class="referrer-item">
                <div class="referrer-source">
                    <div class="referrer-icon">
                        <i class="fas fa-${this.getReferrerIcon(referrer.source)}"></i>
                    </div>
                    <div class="referrer-name">${referrer.source}</div>
                </div>
                <div class="referrer-views">${this.formatNumber(referrer.views)}</div>
            </div>
        `).join('');
    }

    updateAudienceInsights(insights) {
        // Update countries
        this.countryInsightsEl.innerHTML = insights.countries.map(country => `
            <div class="insight-item">
                <span class="insight-label">${country.name}</span>
                <span class="insight-value">${country.percentage}%</span>
            </div>
        `).join('');

        // Update popular tags
        this.popularTagsEl.innerHTML = insights.tags.map(tag => `
            <div class="insight-item">
                <span class="insight-label">${tag.name}</span>
                <span class="insight-value">${tag.count}</span>
            </div>
        `).join('');

        // Update growth metrics
        this.growthMetricsEl.innerHTML = `
            <div class="growth-metric">
                <div class="growth-metric-label">Follower growth</div>
                <div class="growth-metric-value">${this.formatNumber(insights.followerGrowth)}</div>
                <div class="growth-metric-change positive">+${insights.followerGrowthRate}%</div>
            </div>
            <div class="growth-metric">
                <div class="growth-metric-label">Avg. read time</div>
                <div class="growth-metric-value">${insights.avgReadTime}m</div>
                <div class="growth-metric-change ${insights.readTimeChange >= 0 ? 'positive' : 'negative'}">
                    ${insights.readTimeChange >= 0 ? '+' : ''}${insights.readTimeChange}%
                </div>
            </div>
        `;

        // Update reading times chart placeholder
        this.readingTimesChartEl.innerHTML = '<div>Reading times distribution chart</div>';
    }

    sortStoryPerformance(sortBy) {
        // This would re-fetch and sort the performance data
        console.log('Sorting by:', sortBy);
        // For now, just reload the data
        this.fetchStoryPerformance().then(data => {
            // Sort the data based on the selected criteria
            data.sort((a, b) => b[sortBy] - a[sortBy]);
            this.updatePerformanceTable(data);
        });
    }

    // Utility functions
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatReadTime(minutes) {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins}m`;
        }
        return `${minutes}m`;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    formatChartDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    getReferrerIcon(source) {
        const iconMap = {
            'Google': 'search',
            'Twitter': 'twitter',
            'Facebook': 'facebook',
            'LinkedIn': 'linkedin',
            'Reddit': 'reddit',
            'Direct': 'globe',
            'Medium': 'medium'
        };
        return iconMap[source] || 'external-link-alt';
    }

    showError(message) {
        console.error(message);
        // You could show a toast notification here
    }

    // Mock data generators (for when API endpoints aren't available)
    getMockOverviewStats() {
        return {
            totalViews: 12500,
            totalReaders: 8300,
            totalReadTime: 1250,
            totalClaps: 430,
            viewsChange: 15.2,
            readersChange: 8.7,
            readTimeChange: 12.1,
            clapsChange: 22.3
        };
    }

    getMockChartData() {
        const days = this.currentDateRange;
        const dates = [];
        const views = [];
        const reads = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString());

            views.push(Math.floor(Math.random() * 500) + 100);
            reads.push(Math.floor(Math.random() * 300) + 50);
        }

        return { dates, views, reads };
    }

    getMockTopStories() {
        return [
            { title: "Getting Started with NooblyJS Applications", views: 2340 },
            { title: "Building Scalable Content Management Systems", views: 1890 },
            { title: "Modern JavaScript Patterns and Practices", views: 1560 },
            { title: "Understanding Async/Await in Node.js", views: 1234 },
            { title: "CSS Grid vs Flexbox: When to Use Which", views: 987 }
        ];
    }

    getMockStoryPerformance() {
        return [
            {
                title: "Getting Started with NooblyJS Applications",
                views: 2340,
                reads: 1876,
                readRatio: 80.2,
                claps: 156,
                comments: 23,
                publishedAt: "2025-09-10T10:00:00Z"
            },
            {
                title: "Building Scalable Content Management Systems",
                views: 1890,
                reads: 1323,
                readRatio: 70.0,
                claps: 89,
                comments: 12,
                publishedAt: "2025-09-08T14:30:00Z"
            },
            {
                title: "Modern JavaScript Patterns and Practices",
                views: 1560,
                reads: 1092,
                readRatio: 70.0,
                claps: 67,
                comments: 8,
                publishedAt: "2025-09-05T09:15:00Z"
            }
        ];
    }

    getMockReferrers() {
        return [
            { source: "Google", views: 4567 },
            { source: "Direct", views: 3210 },
            { source: "Twitter", views: 1890 },
            { source: "Medium", views: 1234 },
            { source: "LinkedIn", views: 876 }
        ];
    }

    getMockAudienceInsights() {
        return {
            countries: [
                { name: "United States", percentage: 45.2 },
                { name: "United Kingdom", percentage: 12.8 },
                { name: "Canada", percentage: 8.9 },
                { name: "Germany", percentage: 6.7 },
                { name: "Australia", percentage: 5.1 }
            ],
            tags: [
                { name: "JavaScript", count: 234 },
                { name: "Web Development", count: 189 },
                { name: "Node.js", count: 156 },
                { name: "React", count: 134 },
                { name: "CSS", count: 98 }
            ],
            followerGrowth: 127,
            followerGrowthRate: 18.5,
            avgReadTime: 4.2,
            readTimeChange: 12.3
        };
    }
}

// Initialize the stats app
let adminStatsApp;
document.addEventListener('DOMContentLoaded', () => {
    adminStatsApp = new AdminStatsApp();
});

// Utility functions for dropdown menu
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}

function logout() {
    fetch('/applications/blog/logout', { method: 'POST' })
        .then(() => {
            window.location.href = '/applications/blog';
        });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown').classList.add('hidden');
    }
});