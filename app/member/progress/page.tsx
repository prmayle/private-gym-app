"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft } from "lucide-react"

// Mock data for progress metrics
const progressData = {
  weight: [
    { date: "2023-01-15", value: 85.5 },
    { date: "2023-02-15", value: 83.2 },
    { date: "2023-03-15", value: 81.7 },
    { date: "2023-04-15", value: 80.3 },
    { date: "2023-05-15", value: 79.1 },
    { date: "2023-06-15", value: 78.4 },
  ],
  bodyFat: [
    { date: "2023-01-15", value: 24.5 },
    { date: "2023-02-15", value: 23.8 },
    { date: "2023-03-15", value: 22.9 },
    { date: "2023-04-15", value: 21.7 },
    { date: "2023-05-15", value: 20.8 },
    { date: "2023-06-15", value: 19.5 },
  ],
  muscleMass: [
    { date: "2023-01-15", value: 35.2 },
    { date: "2023-02-15", value: 35.8 },
    { date: "2023-03-15", value: 36.5 },
    { date: "2023-04-15", value: 37.2 },
    { date: "2023-05-15", value: 38.1 },
    { date: "2023-06-15", value: 39.0 },
  ],
  measurements: {
    chest: [
      { date: "2023-01-15", value: 102 },
      { date: "2023-03-15", value: 100 },
      { date: "2023-05-15", value: 98 },
    ],
    waist: [
      { date: "2023-01-15", value: 92 },
      { date: "2023-03-15", value: 89 },
      { date: "2023-05-15", value: 86 },
    ],
    hips: [
      { date: "2023-01-15", value: 104 },
      { date: "2023-03-15", value: 102 },
      { date: "2023-05-15", value: 100 },
    ],
    arms: [
      { date: "2023-01-15", value: 33 },
      { date: "2023-03-15", value: 34 },
      { date: "2023-05-15", value: 35 },
    ],
    thighs: [
      { date: "2023-01-15", value: 58 },
      { date: "2023-03-15", value: 57 },
      { date: "2023-05-15", value: 56 },
    ],
  },
}

// Helper function to format dates
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Helper function to calculate change
const calculateChange = (data) => {
  if (data.length < 2) return { value: 0, isPositive: true }

  const latest = data[data.length - 1].value
  const previous = data[data.length - 2].value
  const change = latest - previous

  return {
    value: Math.abs(change).toFixed(1),
    isPositive: change >= 0,
  }
}

// Simple chart component using divs
const SimpleChart = ({ data, unit, decreaseIsGood = false }) => {
  const maxValue = Math.max(...data.map((item) => item.value)) * 1.1
  const minValue = Math.min(...data.map((item) => item.value)) * 0.9

  return (
    <div className="h-40 flex items-end space-x-2">
      {data.map((item, index) => {
        const height = ((item.value - minValue) / (maxValue - minValue)) * 100
        const isLatest = index === data.length - 1

        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="w-full flex justify-center mb-1">
              <div
                className={`w-full max-w-[30px] rounded-t-sm ${isLatest ? "bg-primary" : "bg-primary/30"}`}
                style={{ height: `${height}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
            {isLatest && (
              <div className="text-xs font-medium mt-1">
                {item.value} {unit}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Measurement table component
const MeasurementTable = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Measurement</th>
            {Object.values(data)[0].map((item, index) => (
              <th key={index} className="text-center py-2">
                {formatDate(item.date)}
              </th>
            ))}
            <th className="text-center py-2">Change</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data).map(([key, values]) => {
            const firstValue = values[0].value
            const lastValue = values[values.length - 1].value
            const change = lastValue - firstValue
            const isPositive = change >= 0

            return (
              <tr key={key} className="border-b">
                <td className="py-2 capitalize">{key}</td>
                {values.map((item, index) => (
                  <td key={index} className="text-center py-2">
                    {item.value} cm
                  </td>
                ))}
                <td className="text-center py-2">
                  <span className={isPositive ? "text-green-500" : "text-red-500"}>
                    {isPositive ? "+" : "-"}
                    {Math.abs(change)} cm
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function ProgressPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

  // Calculate changes for metrics
  const weightChange = calculateChange(progressData.weight)
  const bodyFatChange = calculateChange(progressData.bodyFat)
  const muscleMassChange = calculateChange(progressData.muscleMass)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Your Progress</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weight Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Weight</CardTitle>
            <CardDescription>Current: {progressData.weight[progressData.weight.length - 1].value} kg</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Last 6 months</span>
              <span className={`text-sm font-medium ${weightChange.isPositive ? "text-green-500" : "text-red-500"}`}>
                {weightChange.isPositive ? "+" : "-"}
                {weightChange.value} kg
              </span>
            </div>
            <SimpleChart data={progressData.weight} unit="kg" decreaseIsGood={true} />
          </CardContent>
        </Card>

        {/* Body Fat Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Body Fat</CardTitle>
            <CardDescription>Current: {progressData.bodyFat[progressData.bodyFat.length - 1].value}%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Last 6 months</span>
              <span className={`text-sm font-medium ${!bodyFatChange.isPositive ? "text-green-500" : "text-red-500"}`}>
                {bodyFatChange.isPositive ? "+" : "-"}
                {bodyFatChange.value}%
              </span>
            </div>
            <SimpleChart data={progressData.bodyFat} unit="%" decreaseIsGood={true} />
          </CardContent>
        </Card>

        {/* Muscle Mass Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Muscle Mass</CardTitle>
            <CardDescription>
              Current: {progressData.muscleMass[progressData.muscleMass.length - 1].value} kg
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Last 6 months</span>
              <span
                className={`text-sm font-medium ${muscleMassChange.isPositive ? "text-green-500" : "text-red-500"}`}
              >
                {muscleMassChange.isPositive ? "+" : "-"}
                {muscleMassChange.value} kg
              </span>
            </div>
            <SimpleChart data={progressData.muscleMass} unit="kg" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress Summary</CardTitle>
              <CardDescription>Your fitness journey at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Starting Weight</h3>
                    <p className="text-2xl font-bold">{progressData.weight[0].value} kg</p>
                    <p className="text-xs text-muted-foreground">{formatDate(progressData.weight[0].date)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Current Weight</h3>
                    <p className="text-2xl font-bold">{progressData.weight[progressData.weight.length - 1].value} kg</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(progressData.weight[progressData.weight.length - 1].date)}
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">Total Progress</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Weight</span>
                      <span className="text-sm font-medium">
                        {(
                          progressData.weight[progressData.weight.length - 1].value - progressData.weight[0].value
                        ).toFixed(1)}{" "}
                        kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Body Fat</span>
                      <span className="text-sm font-medium">
                        {(
                          progressData.bodyFat[progressData.bodyFat.length - 1].value - progressData.bodyFat[0].value
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Muscle Mass</span>
                      <span className="text-sm font-medium">
                        {(
                          progressData.muscleMass[progressData.muscleMass.length - 1].value -
                          progressData.muscleMass[0].value
                        ).toFixed(1)}{" "}
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">Trainer Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Great progress over the last 6 months! Your consistency with strength training is showing in your
                    muscle mass gains. Let's continue focusing on progressive overload and maintaining your protein
                    intake to support further muscle development.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements">
          <Card>
            <CardHeader>
              <CardTitle>Body Measurements</CardTitle>
              <CardDescription>Detailed measurements over time</CardDescription>
            </CardHeader>
            <CardContent>
              <MeasurementTable data={progressData.measurements} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
