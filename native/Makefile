.SUFFIXES: .c .o

CC=gcc -shared -fPIC -lwiringPi
GCC=gcc -lwiringPi

all:dht11.so dht11_test clean

OBJ1=dht11.o

dht11.so:$(OBJ1)
	$(CC) -o $@ $?

dht11_test:$(OBJ1)
	$(GCC) -o $@ $?

.c.o:
	$(GCC) -c $*.c

clean:
	rm -f *.o
