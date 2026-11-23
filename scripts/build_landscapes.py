"""Rebuild the four web landscapes with blender -b -P scripts/build_landscapes.py."""
import math
import random
import sys
from pathlib import Path
from array import array
import bpy
from mathutils import Vector, noise

OUT = Path(__file__).resolve().parents[1] / "public" / "scenes"
OUT.mkdir(exist_ok=True, parents=True)
sin, cos, tau = math.sin, math.cos, math.tau

def blend_color(first, second, amount):
    t = min(1, max(0, amount))
    return "".join(f"{round(int(first[i:i+2],16)*(1-t)+int(second[i:i+2],16)*t):02x}"
                   for i in (0,2,4))

class Landscape:
    def __init__(self, season):
        self.season = season
        self.r = random.Random(53)
        self.verts, self.faces, self.colors = [], [], []
        self.winter = season == "winter"
        self.vertex_paint = []
        self.wind_weights = None
        self.plant_uvs = None

    def shape(self, points, polygons, color, variation=0, wind=None, tile=None, uv=None):
        start = len(self.verts)
        self.verts.extend(points)
        if self.plant_uvs is not None:
            if tile is None:
                # A white, flat-normal patch leaves snow untextured.
                self.plant_uvs.extend([(.97,.48)]*len(points))
            else:
                x,y={"bark":(0,1),"leaf":(1,1),"palm":(0,0),"blade":(1,0)}[tile]
                self.plant_uvs.extend(((x+.012+.976*u)/2,(y+.012+.976*v)/2) for u,v in uv)
        if self.wind_weights is not None:
            self.wind_weights.extend(wind if wind is not None else [0.]*len(points))
        for face in polygons:
            self.faces.append(tuple(start + i for i in face))
            self.colors.append((color, self.r.uniform(1-variation, 1+variation)))

    def rings(self, x, y, z, levels, n, color, phase=0, variation=.04):
        points = [(x+rx*cos(tau*i/n+phase), y+ry*sin(tau*i/n+phase), z+h)
                  for rx, ry, h in levels for i in range(n)]
        faces = [tuple(reversed(range(n)))]
        for j in range(len(levels)-1):
            for i in range(n):
                a, b = j*n+i, j*n+(i+1)%n
                faces.append((a, b, b+n, a+n))
        faces.append(tuple(range(len(points)-n,len(points))))
        self.shape(points,faces,color,variation)

    def block(self,x,y,z,w,d,h,color):
        self.shape([(x+i*w/2,y+j*d/2,z+k*h) for k in (0,1) for i,j in
                    ((-1,-1),(1,-1),(1,1),(-1,1))],
                   [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],color)

    def river(self,y):
        if self.season=="summer":
            return 1+.13*y+.95*sin(.16*y)+.12*max(0,y-7)**2
        if self.season=="autumn":
            return .6+2.6*sin(y*.12-.45)+sin(y*.062+.4)
        return 2.4+3.6*sin(y*.112)+1.1*sin(y*.27)

    def ground(self,x,y):
        if self.season == "summer":
            return min(1.65,max(-1,(x-self.river(y))*.15))+.07*sin(y)
        if self.season == "autumn":
            bank=min(1,max(0,(abs(x-self.river(y))-1.85)/2.5))
            return -.96+bank*(1.95+.34*sin(y*.25+x*.16)+.22*cos(x*.57))
        bank = min(1,max(0,(abs(x-self.river(y))-1.15)/2.1))
        return -.72+bank*(1.5+.4*sin(x*.34)+.28*sin(y*.32)+min(2,abs(x)*.065))

    def finish_mesh(self, name, smooth=False, material=None):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.verts, [], self.faces)
        mesh.update()
        textured=self.plant_uvs is not None
        if textured:
            layer=mesh.uv_layers.new(name="Plant surface")
            coords=array("f",(v for loop in mesh.loops for v in self.plant_uvs[loop.vertex_index]))
            layer.uv.foreach_set("vector",coords)
            self.plant_uvs=None
        if self.wind_weights is not None:
            flex=mesh.attributes.new(name="_WIND_WEIGHT",type="FLOAT",domain="POINT")
            flex.data.foreach_set("value",self.wind_weights)
            self.wind_weights=None
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        mesh.materials.append(material or self.paint)
        tint = mesh.color_attributes.new(name="Pigment", type="BYTE_COLOR", domain="CORNER")
        colors = {}
        for poly, (hexcolor, v) in zip(mesh.polygons, self.colors):
            if hexcolor not in colors:
                colors[hexcolor] = tuple(int(hexcolor[i:i+2], 16)/255 for i in (0, 2, 4))
            gain=1.19 if textured and hexcolor!="dce9f3" else 1.
            rgba = tuple(min(1, c*v*gain) for c in colors[hexcolor])+(1,)
            for index in poly.loop_indices:
                if self.vertex_paint:
                    rgba = self.vertex_paint[mesh.loops[index].vertex_index]
                tint.data[index].color_srgb = rgba
            poly.use_smooth = smooth
            if hexcolor in ("ffcf83", "ffd589"):
                if len(mesh.materials) == 1:
                    mesh.materials.append(self.glass)
                poly.material_index = 1
        self.verts.clear()
        self.faces.clear()
        self.colors.clear()
        self.vertex_paint.clear()
        return obj

    def surface_grid(self, nx, ny, sample, paint):
        grid = [sample(i, j) for j in range(ny) for i in range(nx)]
        start = len(self.verts)
        self.verts.extend(grid)
        for vertex in grid:
            tint = paint(*vertex)
            self.vertex_paint.append(tuple(int(tint[k:k+2],16)/255 for k in (0,2,4))+(1,))
        for j in range(ny-1):
            for i in range(nx-1):
                a = j*nx+i
                for abc in ((a,a+1,a+nx),(a+1,a+nx+1,a+nx)):
                    self.faces.append(tuple(start+k for k in abc))
                    self.colors.append(("ffffff", 1))

    def terrain(self):
        palette = dict(winter="d5e3ef",spring="92af68",summer="ead092",autumn="ab875b")
        def land(i,j):
            x=(i-72)*.76+self.r.uniform(-.12,.12)
            y=(j-23)*.73+self.r.uniform(-.12,.12)
            return x,y,self.ground(x,y)
        def soil(x,y,z):
            if self.season=="summer":
                return blend_color("ad9877","ead092",(z+.31)/.63)
            wet = "b7c8c9" if self.winter else "bdac83"
            return blend_color(wet,palette[self.season],(z+.05)/.48)
        self.surface_grid(145,90,land,soil)
        self.finish_mesh("Banks",smooth=True)

        ocean = self.season=="summer"
        def wave(i,j):
            subdivisions=2 if ocean else 1
            x,y=(i/subdivisions-66)*.82,(j/subdivisions-30)*.75
            if ocean:
                # Keep a fine swash grid near the beach; fan the outer rows
                # out to open water well beyond the camera's far plane.
                x+=math.copysign(max(0,abs(x)-40)**3*2,x)
                y+=max(0,y-32)**3
            z=-.20 if ocean or self.winter else -.20+.037*sin(x*1.56+y*.34)+.016*sin(y*2.1-x*.7)
            return x,y,z
        def water_color(x,y,z):
            depth=-self.ground(x,y)
            if ocean:
                return blend_color("83cebf","317f97",max((depth-.16)/.89,min(1,y/65)))
            if self.winter:
                return blend_color("cbdee1","88b7c7",(depth-.16)/.65)
            return blend_color("649fa0","407b87",(depth-.12)/.61)
        self.surface_grid(265 if ocean else 133,201 if ocean else 101,wave,water_color)
        self.finish_mesh("Ice" if self.winter else "Water",smooth=True,material=self.water)

    def ice_drifts(self):
        # Low, feather-edged deposits follow the winding banks. A few reach
        # into the channel; most of the ice remains exposed.
        for side in (-1,1):
            y=-19+self.r.uniform(0,2)
            while y<49:
                offset=side*self.r.uniform(.85,1.65)
                phase=self.r.uniform(0,tau)
                width=self.r.uniform(.38,.90)
                length=self.r.uniform(.65,2.0)
                height=self.r.uniform(.045,.14)
                points=[(self.river(y)+offset,y,-.20+height)]
                faces=[]
                sides=40
                for ring in range(1,7):
                    r=ring/6
                    for j in range(sides):
                        a=tau*j/sides
                        edge=1+.18*sin(3*a+phase)+.09*cos(5*a-phase)
                        yy=y+length*r*edge*sin(a)
                        xx=self.river(yy)+offset+width*r*edge*cos(a)
                        points.append((xx,yy,-.209+height*(1-r*r)**1.5))
                        k=1+(ring-1)*sides+j
                        n=1+(ring-1)*sides+(j+1)%sides
                        faces.append((0,k,n) if ring==1 else (k-sides,k,n,n-sides))
                self.shape(points,faces,"e5edf2")
                y+=length+self.r.uniform(.9,3.8)
        self.finish_mesh("Snow on ice",smooth=True)

    def mountains(self):
        # Continuous ridgelines with gullies cut into their flanks.
        tones = {"winter":("7f8da0","e0e9f0"),"spring":("63847b","bac7aa"),
                 "autumn":("89776f","c9b395"),"summer":("638e92","a4b9aa")}
        for row in range(2):
            def rock(i,j):
                x=(i-100)*.79
                y=31+row*14+j*.91
                crest=13+2*sin(x*.14+row)+2*cos(x*.22)
                peak=8+row*4+2.9*sin(x*.093+row)+2.6*cos(x*.27)
                profile=max(0,1-abs(j*.91-crest)/15)
                relief=noise.fractal(Vector((x*.12,y*.15,row+.3)),.85,2.1,4)
                h=profile*(peak+3.0*relief)+.45*relief
                if self.season=="summer": h*=.48
                return x,y,h-.6
            def rock_color(x,y,z):
                base,cap=tones[self.season]
                line=(6+row*3 if self.winter else 10+row*2)+1.4*sin(x*.55)
                cover=(z-line+2.8)/5.6
                seam=noise.noise(Vector((x*.24,y*.19,z*.27)))
                return blend_color(base,cap,cover+seam*.17)
            self.surface_grid(201,32,rock,rock_color)
        self.finish_mesh("Ridges",smooth=True)

    def cliff_foot(self, side, y):
        # A broad mouth opens into a pair of offset spurs at the river bend.
        width=8.8+1.8*cos(y*.11+side)+1.15*sin(y*.24+side*2)
        width+=max(0,8-y)*.19
        return self.river(y)+side*width

    def gorge(self):
        # Poly Haven, Rock Face 03 (CC0).
        granite=self.textured_material("Weathered cliff", "rock_face_03-diffuse.jpg",
                                       "rock_face_03-nor_gl.jpg", .42)
        for side in (-1,1):
            # Broad granite buttresses are shaped in plan. The narrow joints
            # lean through the height of a face, giving it a consistent grain.
            spurs = ((-4, 9, 2.1), (21, 10, 3.3), (48, 8, 2.5)) if side < 0 else (
                (5, 8, 3.0), (34, 12, 3.5), (58, 7, 1.8))
            joints = (-9, 3, 16.5, 19, 36, 50, 62) if side < 0 else (-4, 10, 24, 39, 42, 55)
            def joint_depth(y,z):
                along=y-.11*z-.16*sin(z*.37+side)
                return sum(math.exp(-((along-seam)/.63)**2) for seam in joints)

            def section(y,t):
                # The western wall has a high, blunt shoulder. The eastern
                # skyline descends into a saddle before rising downstream.
                height=(14.5+5.2*math.exp(-((y-14)/14)**4)-2.4*math.exp(-((y-39)/9)**2)
                        if side<0 else 13.4+4.8*math.exp(-((y-3)/13)**2)
                        +3.1*math.exp(-((y-42)/13)**4))
                height+=1.05*sin(.24*y+side)+.32*sin(.49*y-side)
                h=min(1,t/.78)
                z=-.9+height*h
                along=y-.12*z*side
                spur=sum(depth*math.exp(-((along-center)/width)**4)
                         for center,width,depth in spurs)
                # A short foot slope leads into an almost vertical face.
                across=2.1*(1-(1-h)**10)+.14*height*h-spur
                across+=.65*noise.noise(Vector((.14*y+.037*z,.10*z,2.5*side)))
                across+=.32*joint_depth(y,z)
                if t>.78:
                    # Quarter ellipse rolls the brink onto the ridge top.
                    angle=min(1,(t-.78)/.12)*math.pi/2
                    across+=1.1*(1-cos(angle))
                    z+=1.45*sin(angle)
                if t>.90:
                    cap=(t-.90)/.10
                    across+=14*cap
                    z-=1.35*cap**2
                return self.cliff_foot(side,y)+side*across,y,z

            def pigment(x,y,z):
                grain=noise.noise(Vector((y*.40+z*.035,z*.095,side*3.7)))
                wash=noise.noise(Vector((y*.115,z*.075,side*1.8)))
                stone=blend_color("c6c3bf","f5efe6",.50+.38*wash+.27*grain)
                return blend_color(stone,"ada69f",.19*joint_depth(y,z))

            # One shared grid per wall lets normals interpolate across the
            # stone while the buttresses retain their own light and shadow.
            columns=291
            def sample(i,j):
                along=i if side<0 else columns-1-i
                return section(-23+along*.32,j/60)
            self.surface_grid(columns,61,sample,pigment)
            wall=self.finish_mesh("West escarpment" if side==-1 else "East escarpment",
                                  smooth=True,material=granite)
            uv=wall.data.uv_layers.new(name="Rock metres")
            # Measure up each column and over the lip so the top ledges
            # have the same texel density as the upright face.
            tile=8.5 if side<0 else 10.
            coords=[None]*len(wall.data.vertices)
            for i in range(columns):
                distance=0.
                for j in range(61):
                    index=j*columns+i
                    point=wall.data.vertices[index].co
                    if j:
                        distance+=(point-wall.data.vertices[index-columns].co).length
                    coords[index]=(side*point.y/tile+.37*side,distance/tile+.06*side*point.y/tile)
            uv.uv.foreach_set("vector",array("f",(v for loop in wall.data.loops for v in coords[loop.vertex_index])))
            for i in (44,47,63,79,81,103,110,114,129):
                x,y,z=section(-23+.64*(i+(3 if side==1 else 0)),.93)
                self.plant("pine",x,y,z,self.r.uniform(.9,1.9))

        for _ in range(320):
            side=self.r.choice((-1,1))
            y=self.r.uniform(-14,44)
            x=self.cliff_foot(side,y)-side*self.r.uniform(.1,2.7)
            z=self.ground(x,y)
            size=self.r.uniform(.23,.96)
            self.rings(x,y,z-size*.25,[(size*.72,size*.64,0),
                       (size,size*.79,size*.41),(size*.56,size*.45,size*.88)],
                       self.r.choice((5,6,7)),self.r.choice(("80796c","9b8976","9e927e")),
                       self.r.uniform(0,tau),.055)
        self.finish_stones("Talus",1.45)

    def gorge_trees(self):
        for _ in range(95):
            y=self.r.uniform(-12,39)
            side=self.r.choice((-1,1))
            x=self.cliff_foot(side,y)-side*self.r.uniform(1.5,4.1)
            z=self.ground(x,y)
            if z<.5 or (y<1 and abs(x)<7): continue
            self.plant("tree",x,y,z,self.r.uniform(1.4,3.25))
        # Two taller maples frame the entrance below the exposed rock faces.
        for x,y,h in ((-7.2,-3,4.1),(6.6,-1.8,4.25)):
            self.plant("tree",x,y,self.ground(x,y),h)

    def limb(self, base, tip, width, end_width, color, sides=7, tile="bark"):
        a,b=Vector(base),Vector(tip)
        direction=(b-a).normalized()
        u=direction.cross(Vector((0,1,0))).normalized()
        v=direction.cross(u)
        textured=self.plant_uvs is not None
        ring=sides+1 if textured else sides
        points=[tuple(p+r*(cos(tau*(i%sides)/sides)*u+sin(tau*(i%sides)/sides)*v))
                for p,r in ((a,width),(b,end_width)) for i in range(ring)]
        faces=[(i,(i+1)%ring,(i+1)%ring+ring,i+ring) for i in range(sides)]
        faces.append(tuple(range(ring,ring+sides)))
        uv=None
        if textured:
            # Duplicate the seam so interpolation follows the limb circumference.
            span=min(1.,width/.044)
            start=(.31+abs(a.x+a.y)*.73)*(1-span)
            height=min(1.,(b-a).length)
            bottom=a.z if tile=="palm" else (a.z%1)*(1-height)
            uv=[(start+span*i/sides,t) for t in (bottom,bottom+height) for i in range(ring)]
        self.shape(points,faces,color,.025,tile=tile,uv=uv)

    def crown(self,x,y,z,rx,ry,rz,color,sides=10):
        points=[]
        phase=self.r.random()
        for level in range(6):
            t=(level+.09)/5.18*math.pi
            for k in range(sides):
                a=tau*k/sides+phase+.11*(level%2)
                r=sin(t)*self.r.uniform(.88,1.12)
                points.append((x+rx*r*cos(a),y+ry*r*sin(a),z-rz*cos(t)))
        faces=[(j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k)
               for j in range(5) for k in range(sides)]
        faces.extend([tuple(reversed(range(sides))),tuple(range(5*sides,6*sides))])
        self.shape(points,faces,color,.027)

    def pine(self):
        self.limb((0,0,0),(.012,0,.97),.046,.007,"6e5144",10)
        for level in range(7):
            height=.18+level*.112
            length=(1-height)*.37
            count=8 if level<5 else 6
            for i in range(count):
                a=tau*(i/count+level*.157)+self.r.uniform(-.12,.12)
                reach=length*self.r.uniform(.84,1.18)
                dx,dy=cos(a),sin(a)
                # Drooping bough with a raised spine and a scalloped snow mantle.
                points=[]
                for t,width,lift in [(0,.12,.11),(.4,.53,.055),(.73,.41,.012),(1,.035,-.026)]:
                    for side in (-1,0,1):
                        offset=side*width*length
                        points.append((dx*t*reach-dy*offset,dy*t*reach+dx*offset,
                                       height+lift+(.051 if side==0 else 0)*(1-t)))
                faces=[(k,k+3,k+4,k+1) for j in range(3) for k in (3*j,3*j+1)]
                green=self.r.choice(["375b48","476c54","50735b","355644"])
                start=Vector((0,0,height+.08))
                end=Vector((dx*reach,dy*reach,height-.022))
                self.limb(start,end,.008*(1-height*.6),.0014,"715e47",5)
                for sprig in range(8):
                    t=.08+sprig*.112
                    origin=start.lerp(end,t)
                    for side in (-1,1):
                        heading=a+side*(1.18-.30*t)
                        spray=Vector((cos(heading),sin(heading),-.16))*length*(.52-.32*t)
                        self.limb(origin,origin+spray,.003,.0008,green,4)
                        for j in range(6):
                            root=origin+spray*(j/6)
                            for sign in (-1,1):
                                angle=heading+sign*.68
                                size=.033*(1-.32*t)*self.r.uniform(.74,1.17)
                                # Narrow, tapered needles fan away from the twig.
                                edge=Vector((-sin(angle),cos(angle),0))*size*.085
                                mid=root+Vector((cos(angle),sin(angle),.22))*size*.47
                                tip=root+Vector((cos(angle),sin(angle),.14))*size
                                self.shape([tuple(root),tuple(mid+edge),tuple(tip),tuple(mid-edge)],
                                           [(0,1,2),(0,2,3)],green,.042,wind=(0,.47,1,.47),
                                           tile="blade",uv=((.5,0),(.15,.47),(.5,1),(.85,.47)))
                if self.winter:
                    cap=[(px*.88,py*.88,pz+.008+.009*(k%3==1)) for k,(px,py,pz) in enumerate(points)]
                    self.shape(cap,faces,"dce9f3",.018)

    def leaf(self, root, angle, length, color, lobed=False):
        axis=Vector((cos(angle),sin(angle),self.r.uniform(-.83,.64))).normalized()
        across=Vector((-sin(angle),cos(angle),self.r.uniform(-.43,.43))).normalized()
        # Opposite margins meet a raised midrib; the tip curls past the last lobe.
        sections=((.12,.12),(.35,.42),(.31,.24),(.65,.34),(.56,.15),(.83,.14)) if lobed else (
            (.12,.085),(.36,.195),(.61,.20),(.84,.10))
        points=[tuple(root)]
        for t,width in sections:
            center=root+axis*(length*t)
            center.z+=length*(.14*sin(math.pi*t)-.14*t*t)
            for side in (-1,0,1):
                p=center+across*(length*side*width)
                p.z+=length*.052*sin(math.pi*t)*(side==0)
                points.append(tuple(p))
        tip=root+axis*length
        tip.z-=.15*length
        points.append(tuple(tip))
        faces=[(0,2,1),(0,3,2)]
        for j in range(len(sections)-1):
            k=1+3*j
            faces.extend([(k,k+1,k+4,k+3),(k+1,k+2,k+5,k+4)])
        k=len(points)-4
        faces.extend([(k,k+1,k+3),(k+1,k+2,k+3)])
        weights=[0.,*(t for t,_ in sections for _side in range(3)),1.]
        full_width=2*max(width for _,width in sections)
        uv=[(.5,0),*((.5+side*width/full_width,t) for t,width in sections for side in (-1,0,1)),(.5,1)]
        self.shape(points,faces,color,.026,wind=weights,tile="leaf",uv=uv)

    def tree(self):
        bark=self.r.choice(["766554","725c48","897251"])
        autumn=self.season=="autumn"
        palette=self.r.choice([("af4927","d45d29","ee9138","ffae44"),
                               ("af7f28","e2a22d","f4bc40","f3cd58")]) if autumn else self.r.choice([
                               ("427240","638e47","8eb855","b3ce79"),
                               ("587945","7fa15c","e9b2c0","f2cbd0")])
        self.limb((0,0,0),(.031,-.012,.83),.044,.009,bark,10)
        for i in range(17):
            t=i/17
            a=i*2.4+self.r.uniform(-.22,.22)
            reach=(.35-.19*t)*self.r.uniform(.77,1.16)
            base=Vector((.02,0,.25+.51*t))
            joint=base+Vector((reach*.63*cos(a),reach*.63*sin(a),.09))
            self.limb(base,joint,.021*(1-.5*t),.012,bark)
            for fork in (-1,0,1):
                heading=a+fork*.70
                end=joint+Vector((reach*.63*cos(heading),reach*.63*sin(heading),self.r.uniform(.09,.22)))
                self.limb(joint,end,.012,.0038,bark,6)
                for j in range(4):
                    along=.25+j*.22
                    origin=joint.lerp(end,along)
                    angle=heading+(-1 if j%2 else 1)*self.r.uniform(.46,1.3)
                    twig=Vector((cos(angle)*.10,sin(angle)*.10,self.r.uniform(.018,.085)))
                    self.limb(origin,origin+twig,.0036,.0009,bark,4)
                    for pair in range(5):
                        for side in (-1,1):
                            leaf_angle=angle+side*self.r.uniform(.52,1.24)
                            root=origin+twig*((pair+.4)/5)
                            self.leaf(root,leaf_angle,self.r.uniform(.043,.077),
                                      self.r.choice(palette),lobed=autumn)

    def cabin(self,x,y,s):
        z=self.ground(x,y)-.25
        w,d,h=2.15*s,2.65*s,1.58*s
        self.block(x,y,z,w,d,h,"986d54")
        for side in (-1,1):
            yy=y+side*d/2
            self.shape([(x-w/2,yy,z+h),(x+w/2,yy,z+h),(x,yy,z+h+w*.53)],
                       [(0,1,2) if side==-1 else (2,1,0)],"a97e60")
        for side in (-1,1):
            a=x+side*(w*.61)
            points=[(xx,yy,zz+t) for t in (0,.12*s) for xx,zz in
                    [(a,z+h-.12*s),(x,z+h+w*.56)] for yy in [y-d*.59,y+d*.59]]
            self.shape(points,[(0,1,3,2),(4,6,7,5),(0,4,5,1),(1,5,7,3),(0,2,6,4)],"e1e9fa")
        self.block(x+w*.23,y+.46*s,z+h+.25*s,.3*s,.36*s,.98*s,"825d55")
        front=y-d/2-.03
        self.block(x-w*.17,front,z+.05,.44*s,.08,h*.7,"523f38")
        for xx in (x+w*.22,x-w*.34):
            self.block(xx,front-.012,z+h*.55,.38*s,.1,.45*s,"ffcf83")
            self.block(xx,front-.068,z+h*.55,.035*s,.02,.45*s,"655041")
        for offset in (-.23,.23):
            self.block(x+w/2,y+d*offset,z+h*.53,.06,.48*s,.48*s,"ffd589")

        # Timber courses project from the walls and catch the low winter sun.
        for row in range(11):
            height=z+h*(row+.4)/11
            color=self.r.choice(["866149","927056","9c775c"])
            self.block(x,y,height,w+.065*s,d+.065*s,.048*s,color)
        for side in (-1,1):
            self.block(x+side*w*.47,front-.045*s,z,.09*s,.1*s,h,"684c3b")
        door_x=x-w*.17
        self.block(door_x,front-.09*s,z+.04,.47*s,.09*s,h*.7,"695040")
        self.block(door_x+.15*s,front-.15*s,z+h*.37,.045*s,.035*s,.055*s,"dbc28b")
        for xx in (x+w*.22,x-w*.34):
            for side in (-1,1):
                self.block(xx+side*.218*s,front-.087*s,z+h*.53,.048*s,.075*s,.50*s,"695444")
            self.block(xx,front-.1*s,z+h*.55+.21*s,.43*s,.055*s,.035*s,"6a5544")
            self.block(xx,front-.13*s,z+h*.54,.54*s,.23*s,.067*s,"d1e3ee")
        for side in (-1,1):
            self.limb((x+side*w*.59,y-d*.59,z+h-.11*s),
                      (x,y-d*.59,z+h+w*.56),.066*s,.063*s,"725747",8)
            for i in range(13):
                yy=y-d*.55+i*d*1.10/12
                height=self.r.uniform(.07,.24)*s
                self.rings(x+side*w*.61,yy,z+h-.1*s-height,
                           [(.004,.004,0),(.028*s,.03*s,height)],6,"c1dce6")
        for i in range(3):
            self.block(door_x,front-(.55-.15*i)*s,z-.13+i*.085*s,
                       (.95-.11*i)*s,.34*s,.095*s,"a59481")
        self.block(x+w*.23,y+.46*s,z+h+1.18*s,.46*s,.52*s,.1*s,"594c46")
        self.block(x+w*.23,y+.46*s,z+h+1.27*s,.45*s,.50*s,.055*s,"e1e7ec")
        # A wall lantern, shielded by a metal hood.
        lx=x+.008*s
        lz=z+h*.77
        self.block(lx,front-.18*s,lz,.12*s,.11*s,.19*s,"ffd589")
        self.rings(lx,front-.18*s,lz+.18*s,[(.14*s,.12*s,0),(.035*s,.04*s,.09*s)],8,"483f38")

    def finish_stones(self,name,tile,snow_faces=()):
        stones=self.finish_mesh(name,smooth=name=="Shore details",material=self.pebble)
        mesh=stones.data
        if snow_faces:
            mesh.materials.append(self.paint)
            for span in snow_faces:
                for index in span:
                    mesh.polygons[index].material_index=1
                    mesh.polygons[index].use_smooth=False
        uv=mesh.uv_layers.new(name="Stone metres")
        for face in mesh.polygons:
            if face.material_index: continue
            # Project each face onto its broadest plane. World coordinates
            # give neighbouring stones different crops of the same scan.
            axis=max(range(3),key=lambda k: abs(face.normal[k]))
            for index in face.loop_indices:
                x,y,z=mesh.vertices[mesh.loops[index].vertex_index].co
                u,v=((y,z),(x,z),(x,y))[axis]
                uv.data[index].uv=(u/tile,v/tile)
        return stones

    def ground_cover(self):
        snow_faces=[]
        for _ in range(650):
            y=self.r.uniform(-15,34)
            x=self.river(y)+self.r.choice((-1,1))*self.r.uniform(1.1,4.8)
            if self.season=="summer" and self.r.random()<.64: continue
            z=self.ground(x,y)
            size=self.r.uniform(.055,.34)
            self.crown(x,y,z,size,size*.73,size*.56,
                       self.r.choice(["d7ded6","dfd7d1","cadbd8"]),7)
            if self.winter and z>-.2:
                first=len(self.faces)
                self.crown(x,y,z+size*.21,size*.91,size*.67,size*.44,"dce8ef",7)
                snow_faces.append(range(first,len(self.faces)))
        self.finish_stones("Shore details",.65,snow_faces)
        if self.season=="summer":
            return
        # Place meadows in patches, with denser ribbons along the banks.
        count=230 if self.winter else 1350
        for i in range(count):
            y=self.r.uniform(-16,33)
            x=(self.river(y)+self.r.choice((-1,1))*self.r.uniform(3.7,9.5)
               if i%3==0 else self.r.uniform(-32,32))
            z=self.ground(x,y)
            if self.season=="autumn" and not self.cliff_foot(-1,y)+1.1<x<self.cliff_foot(1,y)-1.1:
                continue
            if z<.42:
                continue
            if self.winter and (abs(x-self.river(y))>5 or abs(y-4.5)<1.5):
                continue
            self.plant("grass",x,y,z,self.r.uniform(.74,1.40))

    def grass(self):
        colors={"spring":("52753f","789b49","9bb957","b6c981"),
                "autumn":("887d41","9c8746","b39c56","cdb475"),
                "winter":("9d876c","ae997c","c5ad8b","d0b899")}
        palette=colors[self.season]
        for tuft in range(15 if not self.winter else 3):
            a=self.r.random()*tau
            radius=self.r.uniform(.05,1.05)
            cx,cy=cos(a)*radius,sin(a)*radius
            for _ in range(self.r.randrange(13,24)):
                a=self.r.random()*tau
                dx,dy=cos(a),sin(a)
                ox=cx+self.r.uniform(-.06,.06)
                oy=cy+self.r.uniform(-.06,.06)
                height=self.r.uniform(.18,.54)
                lean=self.r.uniform(.3,1.0)*height
                width=self.r.uniform(.009,.023)
                points=[]
                for t in (0,.32,.67,.88):
                    bend=lean*t*t
                    w=width*(1-t*.85)
                    for side in (-1,0,1):
                        points.append((ox+dx*bend-side*w*dy,oy+dy*bend+side*w*dx,
                                       height*(t-.18*t*t)+(.004 if side==0 else 0)))
                points.append((ox+dx*lean,oy+dy*lean,height*.77))
                faces=[(j,j+3,j+4,j+1) for k in (0,3,6) for j in (k,k+1)]
                faces.extend([(9,12,10),(10,12,11)])
                self.shape(points,faces,self.r.choice(palette))
            if self.season=="spring" and tuft%4==0:
                tip=Vector((cx+.04,cy,.44))
                self.limb((cx,cy,0),tip,.007,.004,"677f45",5)
                for j in range(6):
                    self.leaf(tip,j*tau/6,.056,"f4e3b6")

    def palm(self,x=0,y=0,z=0,h=1):
        for j in range(12):
            t=j/12
            u=(j+1)/12
            self.limb((x,y,z+t*h),(x,y,z+u*h),
                      (.054-.022*t)*h,(.051-.022*u)*h,"a18567",10,tile="palm")
        for i in range(9):
            a=i*tau/9
            def point(t,b,up):
                return (x+h*(t*cos(a)-b*sin(a)),y+h*(t*sin(a)+b*cos(a)),z+h*(1+up))
            def rib(t):
                return .56*t-.79*t*t
            self.limb(point(0,0,0),point(.56,0,rib(.56)),.012,.003,"699159")
            for j in range(21):
                t=.035+j*.029
                width=.14*sin(math.pi*(j+1)/23)
                for side in (-1,1):
                    leaf=[point(t,0,rib(t)),point(t+.018,side*width*.45,rib(t)+.006),
                          point(t+.10,side*width,rib(t)-.066),point(t+.043,0,rib(t+.043))]
                    self.shape(leaf,[(0,1,2),(0,2,3)],self.r.choice(["478654","57905a","739b55"]),
                               tile="blade",uv=((.18,0),(.22,.48),(.5,1),(.82,0)))

    def plant(self,kind,x,y,z,h):
        key=(kind,self.r.randrange(5))
        if key not in self.templates:
            textured=kind in ("tree","pine","palm")
            if textured:
                self.plant_uvs=[]
            if kind in ("tree","pine"):
                self.wind_weights=[]
            getattr(self,kind)()
            obj=self.finish_mesh(f"{kind}-{key[1]}",smooth=kind=="tree",
                                 material=self.foliage if textured else self.paint)
            self.templates[key]=obj.data
        else:
            obj=bpy.data.objects.new(kind,self.templates[key])
            bpy.context.collection.objects.link(obj)
        obj["vegetation"]=kind
        obj["variant"]=key[1]
        obj.location=(x,y,z-.035)
        obj.rotation_euler.z=self.r.random()*tau
        obj.scale=(h,h,h)

    def stagger_tree_angles(self):
        camera_x=1.5 if self.season=="autumn" else 0.
        trees=[obj for obj in bpy.context.scene.objects if obj.get("vegetation") in ("tree","pine")]
        trees.sort(key=lambda obj: (obj.location.x-camera_x)**2+(obj.location.y+20)**2)
        # Distant trees use four baked views. Spread equal views apart even
        # there, while retaining each model's authored angle within its view.
        views=[[] for _ in range(4)]
        quarter=tau/4
        for tree in trees:
            x,y,_=tree.location
            bearing=math.atan2(camera_x-x,y+20)
            original=math.floor((bearing-tree.rotation_euler.z)/quarter+.5)%4
            candidates=[(original+step)%4 for step in range(4)]
            view=max(candidates,key=lambda v: min(((x-a)**2+(y-b)**2 for a,b in views[v]),default=math.inf))
            tree.rotation_euler.z+=(original-view)*quarter
            views[view].append((x,y))

    def populate(self):
        if self.season=="summer":
            self.beach()
            return
        if self.season=="autumn":
            self.gorge_trees()
            return
        homes=[(8,1,1.4),(12,5,.98),(5,12,1.13),(-4,8,1.05),(-8,14,.9),(14,14,1.18),(-2,22,.94)]
        if self.winter:
            for x,y,s in homes: self.cabin(x,y,s)
            # Footbridge and handrails across the stream.
            y=4.5
            x=self.river(y)
            for i in range(21): self.block(x+(i-10)*.32,y,1.06,.30,1.1,.13,"916e55")
            for side in (-1,1):
                for i in (-3,0,3): self.block(x+i,y+side*.52,1.17,.11,.11,.72,"71574b")
                self.block(x,y+side*.52,1.84,6.2,.09,.1,"ac8c72")
            self.finish_mesh("Village")
        for _ in range(340):
            x,y=self.r.uniform(-33,34),self.r.uniform(-9,37)
            z=self.ground(x,y)
            if z<.46 or (y<-2 and abs(x)<10): continue
            if self.winter and (any(math.hypot(x-a,y-b)<3.4*s for a,b,s in homes) or
                                (abs(y-4.5)<1.4 and abs(x-self.river(4.5))<4)): continue
            h=self.r.uniform(1.6,4.8)
            if self.winter or self.r.random()<.18: self.plant("pine",x,y,z,h)
            else: self.plant("tree",x,y,z,h)
        if self.season=="spring":
            for x,y,h in [(-8,-9,5.8),(8.7,-8,6.0),(4.8,-3.4,4.8)]:
                self.plant("tree",x,y,self.ground(x,y),h)

    def beach(self):
        for x,y,h in ((5.65,-4.6,4.3),(10.3,4.4,3.7),(17.6,12.8,3.3)):
            self.plant("palm",x,y,self.ground(x,y),h)

        for x,y,s in [(6,1,1.1),(10,6,.85),(14,12,.75)]:
            z=self.ground(x,y)
            self.limb((x,y,z-.08),(x,y,z+2.24*s),.039,.027,"8c7863")
            for i in range(14):
                a,b=i*tau/14,(i+1)*tau/14
                mid=(a+b)/2
                color="edbd83" if i%2 else "c86f56"
                points=[(x,y,z+2.42*s)]
                for r,up in [(.6,2.28),(1.14,1.98),(1.25,1.87)]:
                    for angle in (a,mid,b):
                        points.append((x+s*r*cos(angle),y+s*r*sin(angle),
                                       z+s*(up-(.08 if angle==mid and r>1 else 0))))
                self.shape(points,[(0,1,2),(0,2,3),(1,4,5,2),(2,5,6,3),
                                   (4,7,8,5),(5,8,9,6)],color,.018)
                self.limb((x,y,z+2.30*s),points[-1],.014*s,.008*s,"937b64")
            for offset in (-.62,.62):
                xx=x+offset*s
                yy=y-.35*s
                zz=self.ground(xx,yy)
                for side in (-1,1):
                    legx=xx+side*.26*s
                    self.limb((legx,yy-.57*s,zz),(legx,yy+.40*s,zz+.43*s),.028*s,.028*s,"826b50")
                    self.limb((legx,yy+.5*s,zz),(legx,yy-.45*s,zz+.37*s),.028*s,.028*s,"826b50")
                for strip in range(7):
                    l=xx+s*(strip/7-.5)*.54
                    r=l+s*.54/7
                    points=[(u,yy+v*s,zz+h*s) for v,h in [(-.6,.38),(.12,.35),(.57,.86)] for u in (l,r)]
                    self.shape(points,[(0,1,3,2),(2,3,5,4)],"d6e2da" if strip%2 else "6b94a0")
        self.finish_mesh("Parasols and loungers")

    def textured_material(self,name,color_file,normal_file,strength=1.):
        material=self.paint.copy()
        material.name=name
        nodes=material.node_tree.nodes
        link=material.node_tree.links.new
        shader=nodes.get("Principled BSDF")
        folder=Path(__file__).resolve().parent/"textures"
        pigment=nodes.new("ShaderNodeTexImage")
        pigment.image=bpy.data.images.load(str(folder/color_file))
        mix=nodes.new("ShaderNodeMix")
        mix.data_type="RGBA"
        mix.blend_type="MULTIPLY"
        mix.inputs[0].default_value=1.
        color_attribute=next(node for node in nodes if node.type=="VERTEX_COLOR")
        link(color_attribute.outputs["Color"],mix.inputs[6])
        link(pigment.outputs["Color"],mix.inputs[7])
        link(mix.outputs[2],shader.inputs["Base Color"])
        relief=nodes.new("ShaderNodeTexImage")
        relief.image=bpy.data.images.load(str(folder/normal_file))
        relief.image.colorspace_settings.name="Non-Color"
        normal=nodes.new("ShaderNodeNormalMap")
        normal.inputs["Strength"].default_value=strength
        link(relief.outputs["Color"],normal.inputs["Color"])
        link(normal.outputs["Normal"],shader.inputs["Normal"])
        return material

    def export(self):
        self.paint=bpy.data.materials.new("Pigment")
        self.paint.use_nodes=True
        shader=self.paint.node_tree.nodes.get("Principled BSDF")
        attr=self.paint.node_tree.nodes.new("ShaderNodeVertexColor")
        attr.layer_name="Pigment"
        self.paint.node_tree.links.new(attr.outputs["Color"],shader.inputs["Base Color"])
        shader.inputs["Roughness"].default_value=.83
        # Foliage atlas: Poly Haven bark_brown_02 and Joe Wroten's leaf macro.
        self.foliage=self.textured_material("Bark and leaf surfaces","plant-color.jpg","plant-normal.jpg")
        # Poly Haven, Rock Boulder Dry (CC0).
        self.pebble=self.textured_material("Weathered pebble","rock_boulder_dry-diffuse.jpg",
                                           "rock_boulder_dry-nor_gl.jpg",.36)
        self.water=self.paint.copy()
        self.water.name="Water surface"
        self.water.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value=.23
        self.glass=self.paint.copy()
        self.glass.name="Lit windows"
        glass=self.glass.node_tree.nodes.get("Principled BSDF")
        glass.inputs["Emission Color"].default_value=(1,.46,.11,1)
        glass.inputs["Emission Strength"].default_value=1.1
        self.templates={}
        self.terrain()
        if self.season!="summer":
            self.mountains()
        if self.season=="autumn":
            self.gorge()
        self.populate()
        if self.season in ("spring","autumn"):
            self.stagger_tree_angles()
        self.ground_cover()
        if self.winter:
            self.ice_drifts()
        bpy.ops.export_scene.gltf(filepath=str(OUT/(self.season+".glb")),export_yup=True,
                                  export_extras=True, export_attributes=True, export_gpu_instances=False,
                                  export_meshopt_compression_enable=True)
        # A transparent still doubles as the instant preview and WebGL fallback.
        scene=bpy.context.scene
        cam=bpy.data.cameras.new("View")
        camera=bpy.data.objects.new("View",cam)
        scene.collection.objects.link(camera)
        camera.location=(0,-25,9)
        camera.rotation_euler=(Vector((0,7,2.4))-camera.location).to_track_quat('-Z','Y').to_euler()
        if self.season=="autumn":
            camera.location=(1.5,-20,5.9)
            camera.rotation_euler=(Vector((.4,12,3.1))-camera.location).to_track_quat('-Z','Y').to_euler()
        cam.lens=32
        if self.season=="summer":
            camera.location=(1,-16,4.8)
            camera.rotation_euler=(Vector((-1.8,12,3.5))-camera.location).to_track_quat('-Z','Y').to_euler()
            cam.clip_end=1600
        scene.camera=camera
        scene.render.engine="BLENDER_WORKBENCH"
        scene.display.shading.color_type="VERTEX"
        scene.display.shading.light="STUDIO"
        scene.display.shading.show_cavity=True
        scene.display.shading.cavity_type="WORLD"
        scene.display.shading.show_shadows=True
        scene.view_settings.view_transform="Standard"
        scene.render.film_transparent=True
        scene.render.resolution_x,scene.render.resolution_y=1400,900
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="WEBP"
        scene.render.image_settings.color_mode="RGBA"
        scene.render.image_settings.quality=85
        scene.render.filepath=str(OUT/(self.season+".webp"))
        bpy.ops.render.render(write_still=True)

seasons=("winter","spring","summer","autumn")
selected=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else seasons
if any(season not in seasons for season in selected):
    raise ValueError("Expected a season name after --")
for season in selected:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    Landscape(season).export()
