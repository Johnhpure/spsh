<template>
  <div class="dashboard-container">
    <h1 class="page-title">统计仪表板</h1>
    
    <!-- 时间范围选择器 -->
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

    <!-- 错误状态 -->
    <ErrorState
      v-if="error && !loading"
      title="加载失败"
      sub-title="统计数据加载失败，请点击重试按钮重新加载"
      @retry="loadStatistics"
    />

    <!-- 数据内容 -->
    <template v-if="!error">
      <div v-loading="loading" class="content-wrapper">
        <!-- 统计卡片 -->
        <div class="stats-cards">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-label">总失败数</div>
              <div class="stat-value">{{ statistics?.totalFailures || 0 }}</div>
            </div>
          </el-card>
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-label">平均处理时间</div>
              <div class="stat-value">{{ formatProcessingTime(statistics?.avgProcessingTime || 0) }}</div>
            </div>
          </el-card>
        </div>

        <!-- 空状态 -->
        <el-empty
          v-if="!loading && statistics && statistics.totalFailures === 0"
          description="暂无统计数据"
          :image-size="200"
        />

        <!-- 图表区域 -->
        <div v-if="statistics && statistics.totalFailures > 0" class="charts-container">
          <!-- 失败数量时间趋势折线图 -->
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">失败数量时间趋势</div>
            </template>
            <div ref="trendChartRef" class="chart" v-loading="chartLoading"></div>
          </el-card>

          <!-- 审核阶段分布饼图 -->
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">审核阶段分布</div>
            </template>
            <div ref="stageChartRef" class="chart" v-loading="chartLoading"></div>
          </el-card>

          <!-- 失败原因排行榜柱状图 -->
          <el-card class="chart-card full-width">
            <template #header>
              <div class="card-header">失败原因排行榜</div>
            </template>
            <div ref="reasonChartRef" class="chart chart-large" v-loading="chartLoading"></div>
          </el-card>
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

// 状态管理
const loading = ref(false);
const chartLoading = ref(false);
const error = ref(false);
const dateRange = ref<[string, string] | null>(null);
const statistics = ref<Statistics | null>(null);

// 图表引用
const trendChartRef = ref<HTMLElement | null>(null);
const stageChartRef = ref<HTMLElement | null>(null);
const reasonChartRef = ref<HTMLElement | null>(null);

// ECharts实例
let trendChart: ECharts | null = null;
let stageChart: ECharts | null = null;
let reasonChart: ECharts | null = null;

// 审核阶段标签映射
const stageLabels: Record<string, string> = {
  text: '文本审核',
  image: '图片审核',
  business_scope: '经营范围审核'
};

// 加载统计数据
const loadStatistics = async () => {
  loading.value = true;
  chartLoading.value = true;
  error.value = false;
  try {
    const startDate = dateRange.value?.[0];
    const endDate = dateRange.value?.[1];
    
    statistics.value = await auditRecordAPI.getStatistics(startDate, endDate);
    
    // 渲染图表
    renderCharts();
  } catch (err: any) {
    error.value = true;
  } finally {
    loading.value = false;
    chartLoading.value = false;
  }
};

// 时间范围变化处理
const handleDateChange = () => {
  loadStatistics();
};

// 格式化处理时间
const formatProcessingTime = (ms: number): string => {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

// 初始化图表
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

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
};

// 渲染所有图表
const renderCharts = () => {
  if (!statistics.value) return;

  renderTrendChart();
  renderStageChart();
  renderReasonChart();
};

// 渲染失败数量时间趋势折线图
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
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
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

// 渲染审核阶段分布饼图
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
        color: ['#409EFF', '#67C23A', '#E6A23C']
      }
    ]
  };

  stageChart.setOption(option);
};

// 渲染失败原因排行榜柱状图
const renderReasonChart = () => {
  if (!reasonChart || !statistics.value) return;

  // 按数量降序排序
  const sortedReasons = Object.entries(statistics.value.byReason)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // 只显示前10个

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
          // 截断过长的文本
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
            { offset: 0, color: '#F56C6C' },
            { offset: 1, color: '#E6A23C' }
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

// 处理窗口大小变化
const handleResize = () => {
  trendChart?.resize();
  stageChart?.resize();
  reasonChart?.resize();
};

// 组件挂载时初始化
onMounted(() => {
  initCharts();
  loadStatistics();
});

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  trendChart?.dispose();
  stageChart?.dispose();
  reasonChart?.dispose();
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.date-picker-container {
  margin-bottom: 20px;
}

.date-picker {
  width: 400px;
}

.content-wrapper {
  min-height: 400px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  cursor: default;
}

.stat-content {
  text-align: center;
  padding: 10px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.chart-card {
  min-height: 400px;
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart {
  width: 100%;
  height: 350px;
}

.chart-large {
  height: 400px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 10px;
  }

  .page-title {
    font-size: 20px;
    margin-bottom: 15px;
  }

  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .date-picker {
    width: 100%;
  }

  .stats-cards {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .stat-value {
    font-size: 28px;
  }

  .chart {
    height: 300px;
  }

  .chart-large {
    height: 350px;
  }
}

@media (max-width: 480px) {
  .stat-label {
    font-size: 12px;
  }

  .stat-value {
    font-size: 24px;
  }

  .card-header {
    font-size: 14px;
  }

  .chart {
    height: 250px;
  }

  .chart-large {
    height: 300px;
  }
}
</style>
