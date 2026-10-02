0000000000001300 <process_array_optimized>:
    1300:	f3 0f 1e fa          	endbr64 
    1304:	85 f6                	test   esi,esi
    1306:	7e 28                	jle    1330 <process_array_optimized+0x30>
    1308:	48 63 c6             	movsxd rax,esi
    130b:	48 8d 0c 87          	lea    rcx,[rdi+rax*4]
    130f:	31 c0                	xor    eax,eax
    1311:	0f 1f 80 00 00 00 00 	nop    DWORD PTR [rax+0x0]
    1318:	03 07                	add    eax,DWORD PTR [rdi]
    131a:	48 83 c7 04          	add    rdi,0x4
    131e:	48 39 cf             	cmp    rdi,rcx
    1321:	75 f5                	jne    1318 <process_array_optimized+0x18>
    1323:	c3                   	ret    
    1324:	66 2e 0f 1f 84 00 00 	nop    WORD PTR cs:[rax+rax*1+0x0]
    132b:	00 00 00 
    132e:	66 90                	nop
    1330:	31 c0                	xor    eax,eax
    1332:	c3                   	ret    
