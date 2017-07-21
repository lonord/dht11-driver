#include <wiringPi.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#define MAX_TIME 85
#define DHT11PIN 7
#define ATTEMPTS 5                 //retry 5 times when no response

int dht11_read_val(int *temp, int *hum){
	int dht11_val[5]={0,0,0,0,0};
	uint8_t lststate=HIGH;         //last state
	uint8_t counter=0;
	uint8_t j=0,i;
	*temp = 0;
	*hum = 0;
	for(i=0;i<5;i++)
		dht11_val[i]=0;

	//host send start signal    
	pinMode(DHT11PIN,OUTPUT);      //set pin to output 
	digitalWrite(DHT11PIN,LOW);    //set to low at least 18ms 
	delay(18);
	digitalWrite(DHT11PIN,HIGH);   //set to high 20-40us
	delayMicroseconds(40);

	//start recieve dht response
	pinMode(DHT11PIN,INPUT);       //set pin to input
	for(i=0;i<MAX_TIME;i++)         
	{
		counter=0;
		while(digitalRead(DHT11PIN)==lststate){     //read pin state to see if dht responsed. if dht always high for 255 + 1 times, break this while circle
			counter++;
			delayMicroseconds(1);
			if(counter==255)
				break;
		}
		lststate=digitalRead(DHT11PIN);             //read current state and store as last state. 
		if(counter==255)                            //if dht always high for 255 + 1 times, break this for circle
			break;
		// top 3 transistions are ignored, maybe aim to wait for dht finish response signal
		if((i>=4)&&(i%2==0)){
			dht11_val[j/8]<<=1;                     //write 1 bit to 0 by moving left (auto add 0)
			if(counter>16)                          //long mean 1
				dht11_val[j/8]|=1;                  //write 1 bit to 1 
			j++;
		}
	}
	// verify checksum and print the verified data
	if((j>=40)&&(dht11_val[4]==((dht11_val[0]+dht11_val[1]+dht11_val[2]+dht11_val[3])& 0xFF))){
		*temp = dht11_val[2];
		*hum = dht11_val[0];
		return 1;
	}
	else
		return 0;
}

int readValue(int *temp, int *hum)
{
	int attempts=ATTEMPTS;
	if(wiringPiSetup()==-1)
		return 0;
	while(attempts){                        //you have 5 times to retry
		int success = dht11_read_val(temp, hum);     //get result including printing out
		if (success) {                      //if get result, quit program; if not, retry 5 times then quit
			break;
		}
		attempts--;
		delay(500);
	}
	return 1;
}

int main(void){
	int temp, hum;
	if (readValue(&temp, &hum) == 0)
	{
		return 1;
	}
	printf("RH:%d,TEMP:%d\n",hum,temp);
	return 0;
}
