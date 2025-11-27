<template>
  <div class="dashboard-container">
    <!-- Date Picker -->
    <div class="date-picker-container">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        @change="handleDateChange"
        class="date-picker"
        :disabled="loading || error"
      />
    </div>

    <!-- Error State -->
    <ErrorState
      v-if="error && !loading"
      title="加载失败"
      sub-title="统计数据加载失败，请点击重试按钮重新加载"
      @retry="loadStatistics"
    />

    <!-- Content -->
    <template v-if="!error">
      <div v-loading="loading" class="content-wrapper">
        <!-- Stats Cards -->
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">总失败数</div>
              <div class="stat-value">{{ statistics?.totalFailures || 0 }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">平均处理时间</div>
              <div class="stat-value">{{ formatProcessingTime(statistics?.avgProcessingTime || 0) }}</div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <el-empty
          v-if="!loading && statistics && statistics.totalFailures === 0"
          description="暂无统计数据"
          :image-size="200"
        />

        <!-- Charts Area -->
        <div v-if="statistics && statistics.totalFailures > 0" class="charts-container">
          <!-- Trend Chart -->
          <div class="chart-card">
            <div class="card-header">失败数量时间趋势</div>
            <div ref="trendChartRef" class="chart" v-loading="chartLoading"></div>
          </div>

          <!-- Stage Chart -->
          <div class="chart-card">
            <div class="card-header">审核阶段分布</div>
            <div ref="stageChartRef" class="chart" v-loading="chartLoading"></div>
          </div>

          <!-- Reason Chart -->
          <div class="chart-card full-width">
            <div class="card-header">失败原因排行榜</div>
            <div ref="reasonChartRef" class="chart chart-large" v-loading="chartLoading"></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { auditRecordAPI } from '../services/api';
import type { Statistics } from '../services/api';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import ErrorState from '../components/ErrorState.vue';

// State
const loading = ref(false);
const chartLoading = ref(false);
const error = ref(false);
const dateRange = ref<[string, string] | null>(null);
const statistics = ref<Statistics | null>(null);

// Chart Refs
const trendChartRef = ref<HTMLElement | null>(null);
const stageChartRef = ref<HTMLElement | null>(null);
const reasonChartRef = ref<HTMLElement | null>(null);

// ECharts Instances
let trendChart: ECharts | null = null;
let stageChart: ECharts | null = null;
let reasonChart: ECharts | null = null;

// Stage Labels
const stageLabels: Record<string, string> = {
  text: '文本审核',
  image: '图片审核',
  business_scope: '经营范围审核'
};

// Load Data
const loadStatistics = async () => {
  loading.value = true;
  chartLoading.value = true;
  error.value = false;
  try {
    const startDate = dateRange.value?.[0];
    const endDate = dateRange.value?.[1];
    
    statistics.value = await auditRecordAPI.getStatistics(startDate, endDate);
    
    // Render Charts
    renderCharts();
  } catch (err: any) {
    error.value = true;
  } finally {
    loading.value = false;
    chartLoading.value = false;
  }
};

// Handle Date Change
const handleDateChange = () => {
  loadStatistics();
};

// Format Time
const formatProcessingTime = (ms: number): string => {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

// Init Charts
const initCharts = () => {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value);
  }
  if (stageChartRef.value) {
    stageChart = echarts.init(stageChartRef.value);
  }
  if (reasonChartRef.value) {
    reasonChart = echarts.init(reasonChartRef.value);
  }

  window.addEventListener('resize', handleResize);
};

// Render All Charts
const renderCharts = () => {
  if (!statistics.value) return;

  renderTrendChart();
  renderStageChart();
  renderReasonChart();
};

// Render Trend Chart
const renderTrendChart = () => {
  if (!trendChart || !statistics.value) return;

  const dates = statistics.value.trend.map(item => item.date);
  const counts = statistics.value.trend.map(item => item.count);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '失败数量'
    },
    series: [
      {
        name: '失败数量',
        type: 'line',
        data: counts,
        smooth: true,
        itemStyle: {
          color: '#007AFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 122, 255, 0.3)' },
            { offset: 1, color: 'rgba(0, 122, 255, 0.05)' }
          ])
        }
      }
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    }
  };

  trendChart.setOption(option);
};

// Render Stage Chart
const renderStageChart = () => {
  if (!stageChart || !statistics.value) return;

  const data = Object.entries(statistics.value.byStage).map(([stage, count]) => ({
    name: stageLabels[stage] || stage,
    value: count
  }));

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '审核阶段',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {d}%'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: data,
        color: ['#007AFF', '#34C759', '#FF9500']
      }
    ]
  };

  stageChart.setOption(option);
};

// Render Reason Chart
const renderReasonChart = () => {
  if (!reasonChart || !statistics.value) return;

  const sortedReasons = Object.entries(statistics.value.byReason)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const reasons = sortedReasons.map(item => item[0]);
  const counts = sortedReasons.map(item => item[1]);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: reasons,
      axisLabel: {
        interval: 0,
        rotate: 45,
        formatter: (value: string) => {
          return value.length > 15 ? value.substring(0, 15) + '...' : value;
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '失败数量'
    },
    series: [
      {
        name: '失败数量',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#FF3B30' },
            { offset: 1, color: '#FF9500' }
          ])
        },
        label: {
          show: true,
          position: 'top'
        }
      }
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '20%',
      containLabel: true
    }
  };

  reasonChart.setOption(option);
};

const handleResize = () => {
  trendChart?.resize();
  stageChart?.resize();
  reasonChart?.resize();
};

onMounted(() => {
  initCharts();
  loadStatistics();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  trendChart?.dispose();
  stageChart?.dispose();
  reasonChart?.dispose();
});
</script>

<style scoped>
.dashboard-container {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.date-picker-container {
  margin-bottom: 32px;
}

.date-picker {
  width: 400px;
}

.date-picker :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: none;
  border: 1px solid var(--ui-border);
  background-color: white;
  transition: all 0.2s ease;
}

.date-picker :deep(.el-input__wrapper:hover),
.date-picker :deep(.el-input__wrapper.is-focus) {
  border-color: var(--ui-primary);
  box-shadow: 0 0 0 1px var(--ui-primary);
}

.content-wrapper {
  min-height: 400px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--ui-card-bg);
  border-radius: var(--ui-card-radius);
  box-shadow: var(--ui-shadow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
  padding: 32px 24px;
  text-align: center;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--ui-shadow-hover);
}

.stat-label {
  font-size: 14px;
  color: var(--ui-text-sub);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.stat-value {
  font-size: 42px;
  font-weight: 700;
  color: var(--ui-text-main);
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.chart-card {
  background: var(--ui-card-bg);
  border-radius: var(--ui-card-radius);
  box-shadow: var(--ui-shadow);
  padding: 24px;
  min-height: 400px;
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: var(--ui-shadow-hover);
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.card-header {
  font-size: 18px;
  font-weight: 700;
  color: var(--ui-text-main);
  margin-bottom: 24px;
}

.chart {
  width: 100%;
  height: 350px;
}

.chart-large {
  height: 400px;
}

/* Responsive */
@media (max-width: 1024px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .date-picker {
    width: 100%;
  }
  
  .stat-value {
    font-size: 36px;
  }
}
</style>
