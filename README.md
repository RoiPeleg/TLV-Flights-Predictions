# Real Time Flights Radar
<p align="center">
    Tal Abed, Roi Peleg
</p>

## The Dashboard
In our dashboard you can see a map with the current location of the flights that are about to land in Ben-Gurion Airport in Tel Aviv or are about take off from it. You can also see cards with the following information:
- The amount of flights that are about to land in Ben-Gurion Airport
- The amount of flights that are about to take off from Ben-Gurion Airport
- The current temparature and weather in Tel Aviv
- the current time and date
![](Images/dashboard_Image.jpeg)
In Addition, you can move to pages in which you can see a table with all the flights that are about land/takeoff. Each flight has information about it in the table:
![](Images/Table_Image.jpeg)
### How does the dashboard work?
To collect informatin about the flights we are doing HTTP requests from FlightsRadar24. We filter the information we got so we stay with only flights that are from or to Tel Aviv. Than we create a JSON for each flights we the details we want to show about the flight.<br />
When we have a list of flights JSON's we are sending it to Kafka, and from there, by using [KafkaConsumer](https://github.com/RoiPeleg/TLV-Flights-Predictions/blob/main/Dashboard_Server/Model/kafkaConsumer.js) we read the data into Redis database.<br />
To show the information in the dashboard and in the table we read
