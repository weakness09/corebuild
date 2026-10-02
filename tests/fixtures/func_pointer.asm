0000000000001400 <dispatch_handler>:
    1400:	f3 0f 1e fa          	endbr64 
    1404:	55                   	push   rbp
    1405:	48 89 e5             	mov    rbp,rsp
    1408:	48 83 ec 18          	sub    rsp,0x18
    140c:	48 89 7d e8          	mov    QWORD PTR [rbp-0x18],rdi
    1410:	89 75 e4             	mov    DWORD PTR [rbp-0x1c],esi
    1413:	48 8b 45 e8          	mov    rax,QWORD PTR [rbp-0x18]
    1417:	8b 7d e4             	mov    edi,DWORD PTR [rbp-0x1c]
    141a:	ff d0                	call   rax
    141c:	48 8d 15 e0 2b 00 00 	lea    rdx,[rip+0x2be0]
    1423:	48 8b 04 c2          	mov    rax,QWORD PTR [rdx+rax*8]
    1427:	ff 10                	call   QWORD PTR [rax]
    1429:	c9                   	leave  
    142a:	c3                   	ret    
