// API配置
const API_BASE = 'https://api.huaxu.app/servers/cn/warzone';
let currentWeek = 568;
let currentDifficulty = '16';

// 计算日期范围（战区每周一刷新）
function getWeekDateRange(week) {
    // 基准日期：第1周的开始日期（需要根据实际情况调整）
    // 这里假设第1周从某个固定日期开始
    // 由于不知道确切的起始周，我们用当前周数反推
    const now = new Date();
    const currentWeekStart = new Date(now);
    // 调整到本周一
    const dayOfWeek = currentWeekStart.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setDate(currentWeekStart.getDate() - diff);

    // 计算目标周的开始日期
    const weekDiff = 568 - week;
    const targetStart = new Date(currentWeekStart);
    targetStart.setDate(targetStart.getDate() - (weekDiff * 7));

    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + 6);

    const formatDate = (date) => {
        return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
    };

    return `${formatDate(targetStart)} - ${formatDate(targetEnd)}`;
}

// 格式化数字
function formatNumber(num) {
    return num.toLocaleString('zh-CN');
}

// 格式化时间
function formatTime(timeStr) {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 创建战区卡片HTML
function createZoneCard(zone) {
    let buffsHtml = '';
    if (zone.buffs && zone.buffs.length > 0) {
        buffsHtml = zone.buffs.map(buff => `
            <div class="zone-info">
                <div class="info-label">增益：${buff.name}</div>
                <div class="info-desc">${buff.description}</div>
            </div>
        `).join('');
    }

    let weathersHtml = '';
    if (zone.weathers && zone.weathers.length > 0) {
        weathersHtml = zone.weathers.map(weather => `
            <div class="zone-info">
                <div class="info-label">天气：${weather.name}</div>
                <div class="info-desc">${weather.description}</div>
            </div>
        `).join('');
    }

    return `
        <div class="zone-card">
            <div class="zone-name">${zone.name}</div>
            <div class="zone-desc">${zone.description}</div>
            ${weathersHtml}
            ${buffsHtml}
        </div>
    `;
}

// 创建混合区子卡片HTML
function createMixedSubCard(zone, buff, weather) {
    return `
        <div class="mixed-sub-card">
            <div class="mixed-sub-header">${zone.name}</div>
            <div class="zone-name">${buff.name}</div>
            <div class="zone-desc">${zone.description}</div>
            <div class="zone-info">
                <div class="info-label">天气：${weather.name}</div>
                <div class="info-desc">${weather.description}</div>
            </div>
            <div class="zone-info">
                <div class="info-label">增益：${buff.name}</div>
                <div class="info-desc">${buff.description}</div>
            </div>
        </div>
    `;
}

// 渲染战区卡片
function renderZones(zones) {
    const container = document.getElementById('zonesContainer');
    let html = '';

    zones.forEach(zone => {
        // 判断是否为混合区（包含多个增益）
        if (zone.buffs && zone.buffs.length >= 2) {
            // 为每个增益创建独立的子卡片
            let subCardsHtml = '';
            zone.buffs.forEach((buff, index) => {
                // 交换天气索引：第一个buff对应第二个weather，第二个buff对应第一个weather
                const weatherIndex = zone.weathers && zone.weathers.length >= 2 ? 1 - index : 0;
                const weather = zone.weathers && zone.weathers[weatherIndex] ? zone.weathers[weatherIndex] : zone.weathers[0];
                subCardsHtml += createMixedSubCard(zone, buff, weather);
            });

            html += `
                <div class="mixed-zone">
                    <div class="mixed-zone-header">
                        ${zone.name} <span class="tag">混合区</span>
                    </div>
                    <div class="mixed-zone-content">
                        ${subCardsHtml}
                    </div>
                </div>
            `;
        } else {
            html += createZoneCard(zone);
        }
    });

    container.innerHTML = html;
}

// 渲染排行榜
function renderRankings(rankings, zones) {
    const container = document.getElementById('rankingTable');

    // 动态生成表头，显示每个战区名称
    let headerHtml = `
        <div class="ranking-header">
            <div class="col-rank">排名</div>
            <div class="col-player">玩家</div>
    `;
    zones.forEach(zone => {
        headerHtml += `<div class="col-zone-score">${zone.name}</div>`;
    });
    headerHtml += `
            <div class="col-total">总分</div>
        </div>
    `;

    let html = headerHtml;

    rankings.slice(0, 100).forEach(ranking => {
        const rankClass = ranking.rank <= 3 ? `top-${ranking.rank}` : '';

        html += `
            <div class="ranking-row">
                <div class="rank-num ${rankClass}">${ranking.rank}</div>
                <div class="player-info">
                    <div class="player-name">${ranking.player.name}</div>
                    <div class="guild-name">${ranking.player.guildName || ''}</div>
                </div>
        `;

        // 显示每个战区的分数
        zones.forEach(zone => {
            const zoneData = ranking.zones ? ranking.zones.find(z => z.id === zone.id) : null;
            const score = zoneData ? formatNumber(zoneData.score) : '--';
            html += `<div class="zone-score">${score}</div>`;
        });

        html += `
                <div class="total-score">${formatNumber(ranking.score)}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 保存zones数据
let zonesData = [];

// 更新页面标题信息
function updateHeader(data) {
    document.getElementById('members').textContent = `参与人数: ${formatNumber(data.members)}`;
    document.getElementById('updatedAt').textContent = `更新时间: ${formatTime(data.updatedAt)}`;
    document.getElementById('weekDisplay').textContent = `第${data.activity}周`;
    document.getElementById('dateRange').textContent = getWeekDateRange(data.activity);
}

// 加载数据
async function loadData() {
    try {
        const url = `${API_BASE}/${currentWeek}/${currentDifficulty}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success' && result.data && result.data.warzone) {
            const warzone = result.data.warzone;
            const rankings = result.data.rankings;

            // 保存zones数据
            zonesData = warzone.area.zones;

            // 更新标题
            updateHeader(warzone);

            // 渲染战区卡片
            renderZones(warzone.area.zones);

            // 渲染排行榜
            if (rankings) {
                renderRankings(rankings, zonesData);
            }
        } else {
            console.error('API返回数据格式错误:', result);
        }
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

// 初始化选择器
function initSelectors() {
    const difficultySelect = document.getElementById('difficultySelect');
    const prevWeekBtn = document.getElementById('prevWeek');
    const nextWeekBtn = document.getElementById('nextWeek');

    difficultySelect.value = currentDifficulty;

    difficultySelect.addEventListener('change', (e) => {
        currentDifficulty = e.target.value;
        loadData();
    });

    prevWeekBtn.addEventListener('click', () => {
        currentWeek--;
        loadData();
    });

    nextWeekBtn.addEventListener('click', () => {
        if (currentWeek < 568) {
            currentWeek++;
            loadData();
        }
    });
}

// 页面加载完成后获取数据
document.addEventListener('DOMContentLoaded', () => {
    initSelectors();
    loadData();
});
