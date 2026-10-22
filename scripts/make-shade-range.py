import math
def hex2lab(h):
    n=int(h[1:],16); rgb=[(n>>16)&255,(n>>8)&255,n&255]
    l=[(c/255)/12.92 if c/255<=0.04045 else ((c/255+0.055)/1.055)**2.4 for c in rgb]
    r,g,b=l
    x=(r*0.4124+g*0.3576+b*0.1805)/0.95047; y=r*0.2126+g*0.7152+b*0.0722; z=(r*0.0193+g*0.1192+b*0.9505)/1.08883
    f=lambda t: t**(1/3) if t>0.008856 else 7.787*t+16/116
    return 116*f(y)-16, 500*(f(x)-f(y)), 200*(f(y)-f(z))
def lab2hex(L,a,b):
    fy=(L+16)/116; fx=fy+a/500; fz=fy-b/200
    inv=lambda t: t**3 if t**3>0.008856 else (t-16/116)/7.787
    x,y,z=inv(fx)*0.95047,inv(fy),inv(fz)*1.08883
    r= 3.2406*x-1.5372*y-0.4986*z; g=-0.9689*x+1.8758*y+0.0415*z; bb=0.0557*x-0.2040*y+1.0570*z
    g2=lambda c: 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
    return '#'+''.join(f'{max(0,min(255,round(g2(c)*255))):02x}' for c in (r,g,bb))
def de2000(l1,l2):
    L1,a1,b1=l1;L2,a2,b2=l2
    C1=math.hypot(a1,b1);C2=math.hypot(a2,b2);Cm=(C1+C2)/2
    G=0.5*(1-math.sqrt(Cm**7/(Cm**7+25**7)))
    a1p,a2p=a1*(1+G),a2*(1+G)
    C1p,C2p=math.hypot(a1p,b1),math.hypot(a2p,b2)
    h1p=math.degrees(math.atan2(b1,a1p))%360; h2p=math.degrees(math.atan2(b2,a2p))%360
    dLp=L2-L1; dCp=C2p-C1p
    dh=h2p-h1p
    if C1p*C2p==0: dh=0
    elif dh>180: dh-=360
    elif dh<-180: dh+=360
    dHp=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dh/2))
    Lm=(L1+L2)/2; Cmp=(C1p+C2p)/2
    if C1p*C2p==0: hm=h1p+h2p
    elif abs(h1p-h2p)<=180: hm=(h1p+h2p)/2
    else: hm=(h1p+h2p+360)/2 if h1p+h2p<360 else (h1p+h2p-360)/2
    T=1-0.17*math.cos(math.radians(hm-30))+0.24*math.cos(math.radians(2*hm))+0.32*math.cos(math.radians(3*hm+6))-0.20*math.cos(math.radians(4*hm-63))
    dth=30*math.exp(-((hm-275)/25)**2); RC=2*math.sqrt(Cmp**7/(Cmp**7+25**7))
    SL=1+0.015*(Lm-50)**2/math.sqrt(20+(Lm-50)**2); SC=1+0.045*Cmp; SH=1+0.015*Cmp*T; RT=-math.sin(math.radians(2*dth))*RC
    return math.sqrt((dLp/SL)**2+(dCp/SC)**2+(dHp/SH)**2+RT*(dCp/SC)*(dHp/SH))
if __name__=='__main__':
    skin='#b8957c'; print('skin lab',[round(x,1) for x in hex2lab(skin)])
    print('tint vs skin', de2000(hex2lab('#c18466'),hex2lab(skin)))
    print('old fixture vs real', de2000(hex2lab('#ce9a7e'),hex2lab(skin)))
    # systematic range: 10 depths x 3 undertones
    depths=[86,80,74,68,63,58,52,46,39,32]
    names=['Porcelain','Ivory','Shell','Beige','Sand','Tan','Honey','Caramel','Mocha','Espresso']
    und={'C':(48,0.85),'N':(58,1.0),'W':(68,1.1)}  # hue angle, chroma factor
    out=[]
    for i,L in enumerate(depths):
        C=14+ (86-L)*0.22  # chroma grows with depth
        for u,(h,cf) in und.items():
            c=C*cf; a=c*math.cos(math.radians(h)); b=c*math.sin(math.radians(h))
            hx=lab2hex(L,a,b); code=f'{u}{(i+1)*10+ (0 if u=="C" else 3 if u=="N" else 6):03d}'
            out.append((code,names[i],hx,{'C':'cool','N':'neutral','W':'warm'}[u],de2000(hex2lab(hx),hex2lab(skin))))
    for o in sorted(out,key=lambda x:x[4])[:6]: print(o)
    print(len(out))
    import json; json.dump(out,open('range.json','w'))
